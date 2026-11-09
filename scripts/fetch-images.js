#!/usr/bin/env node
// For each round: z-ai image-search "<imageQuery> transparent background png" (shutterstock.com excluded),
// download the best result to public/images/<id>.png. Resume-safe via scripts/.image-progress.json.
// No API keys in code: the z-ai CLI reads its own .z-ai-config (project dir or home dir).
const fs = require("fs");
const os = require("os");
const path = require("path");
const { P, refreshRounds, readSourceRounds, run, has, probeImage, loadProgress, saveProgress, flag } = require("./lib");

const EXCLUDED_HOSTS = ["shutterstock.com"];
const MAX_CANDIDATES = 8;
const MIN_BYTES = 2048;
const MIN_SIDE = 200;

const isExcluded = (u) => EXCLUDED_HOSTS.some((h) => String(u || "").toLowerCase().includes(h));

function searchImages(query) {
  const tmp = path.join(os.tmpdir(), `zai-search-${process.pid}-${Date.now()}.json`);
  // argument array, no shell string interpolation
  const r = run("z-ai", ["image-search", "-q", query, "--count", "20", "--gl", "us", "-o", tmp, "--no-rank"]);
  if (r.error) throw new Error(`could not run z-ai (${r.error.message}). Is the CLI installed?`);
  if (r.status !== 0 || !fs.existsSync(tmp)) throw new Error(`z-ai image-search failed: ${(r.stderr || r.stdout || "").trim().slice(0, 300)}`);
  let json;
  try { json = JSON.parse(fs.readFileSync(tmp, "utf8")); } finally { fs.rmSync(tmp, { force: true }); }
  if (json.success === false) throw new Error(`z-ai image-search error: ${json.error || "unknown"}`);
  const items = (json.results || []).filter((x) => x.original_url && !isExcluded(x.original_url) && !isExcluded(x.source));
  const score = (x) => {
    const w = parseInt(x.original_width, 10) || 0, h = parseInt(x.original_height, 10) || 0;
    const png = /\.png(\?|$)/i.test(x.original_url) ? 1e9 : 0;
    return png + Math.min(w * h, 4e6);
  };
  return items.sort((a, b) => score(b) - score(a));
}

function sniffExt(b) {
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50) return "png";
  if (b[0] === 0xff && b[1] === 0xd8) return "jpg";
  if (b.slice(0, 4).toString() === "RIFF" && b.slice(8, 12).toString() === "WEBP") return "webp";
  if (b.slice(0, 3).toString() === "GIF") return "gif";
  return null;
}

async function download(url, dest) {
  const res = await fetch(url, { signal: AbortSignal.timeout(30000), headers: { "user-agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const b = Buffer.from(await res.arrayBuffer());
  if (b.length < MIN_BYTES) throw new Error("file too small");
  const ext = sniffExt(b);
  if (!ext) throw new Error("not a supported image");
  const file = `${dest}.${ext}`;
  fs.writeFileSync(file, b);
  return file;
}

// Fetch one round. Accepts the first candidate that is a PNG-convertible image WITH an alpha channel;
// falls back to the first readable one (status "done-noalpha") so refetch-broken can try other queries.
async function fetchRound(round, query, progress) {
  const target = path.join(P.images, round.imageFile);
  const tmpBase = path.join(P.images, `.tmp-${round.id}`);
  const entry = { status: "failed", query, url: null, at: new Date().toISOString() };
  try {
    const candidates = searchImages(query).slice(0, MAX_CANDIDATES);
    if (!candidates.length) throw new Error("no results");
    let fallback = null;
    for (const c of candidates) {
      let raw;
      try {
        raw = await download(c.original_url, tmpBase);
        const png = `${tmpBase}.conv.png`;
        const r = run("ffmpeg", ["-y", "-v", "error", "-i", raw, "-frames:v", "1", png]);
        if (r.status !== 0) throw new Error("ffmpeg could not decode it");
        const info = probeImage(png);
        if (!info || info.width < MIN_SIDE || info.height < MIN_SIDE) throw new Error("image too small");
        if (info.hasAlpha) {
          fs.copyFileSync(png, target);
          Object.assign(entry, { status: "done", url: c.original_url });
          fallback = null;
          break;
        }
        if (!fallback) { fallback = path.join(P.images, `.fallback-${round.id}.png`); fs.copyFileSync(png, fallback); entry.url = c.original_url; }
      } catch (e) {
        console.log(`    skip ${c.original_url.slice(0, 80)}: ${e.message}`);
      } finally {
        for (const f of fs.readdirSync(P.images)) if (f.startsWith(`.tmp-${round.id}`)) fs.rmSync(path.join(P.images, f), { force: true });
      }
    }
    if (entry.status !== "done" && fallback) {
      fs.copyFileSync(fallback, target);
      entry.status = "done-noalpha";
    }
    if (fallback) fs.rmSync(fallback, { force: true });
    if (entry.status === "failed") entry.error = "no usable image among candidates";
  } catch (e) {
    entry.error = e.message;
  }
  progress[round.id] = entry;
  saveProgress(progress);
  return entry;
}

async function main() {
  for (const tool of ["ffmpeg", "ffprobe"]) if (!has(tool)) { console.error(`[fetch] ${tool} not found. Install ffmpeg first.`); process.exit(1); }
  if (!has("z-ai", "--help")) { console.error("[fetch] z-ai CLI not found. Install it (npm i -g z-ai-web-dev-sdk) and add a .z-ai-config file."); process.exit(1); }
  fs.mkdirSync(P.images, { recursive: true });
  const only = flag("only", null);
  const onlyIds = only && only !== true ? String(only).split(",").map(Number) : null;
  const { rounds } = readSourceRounds();
  const progress = loadProgress();
  let done = 0, skipped = 0, failed = 0;
  for (const round of rounds) {
    if (onlyIds && !onlyIds.includes(round.id)) continue;
    const have = fs.existsSync(path.join(P.images, round.imageFile));
    const prev = progress[round.id];
    if (have && prev && (prev.status === "done" || prev.status === "done-noalpha")) { skipped++; continue; }
    const query = `${round.imageQuery} transparent background png`;
    console.log(`[fetch] #${round.id} ${round.heroName}: "${query}"`);
    const r = await fetchRound(round, query, progress);
    if (r.status === "failed") { failed++; console.log(`    FAILED: ${r.error}`); }
    else { done++; console.log(`    ${r.status === "done" ? "ok" : "ok (no alpha, run npm run refetch)"}: ${r.url}`); }
  }
  refreshRounds();
  console.log(`[fetch] fetched ${done}, skipped ${skipped} (already done), failed ${failed}`);
  if (failed) process.exit(1);
}

module.exports = { fetchRound };
if (require.main === module) main().catch((e) => { console.error(`[fetch] ${e.message}`); process.exit(1); });
