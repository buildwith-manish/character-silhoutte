#!/usr/bin/env node
// Uses ffprobe to find images that are missing, tiny, or have no alpha channel (a silhouette needs a transparent cutout),
// removes them from the progress file and re-runs the fetch with alternate queries.
const fs = require("fs");
const path = require("path");
const { P, refreshRounds, readSourceRounds, has, probeImage, loadProgress, saveProgress } = require("./lib");
const { fetchRound } = require("./fetch-images");

const MIN_BYTES = 5000, MIN_SIDE = 200;

function diagnose(round) {
  const file = path.join(P.images, round.imageFile);
  if (!fs.existsSync(file)) return "missing";
  if (fs.statSync(file).size < MIN_BYTES) return "tiny file";
  const info = probeImage(file);
  if (!info) return "unreadable";
  if (info.width < MIN_SIDE || info.height < MIN_SIDE) return `tiny image (${info.width}x${info.height})`;
  if (!info.hasAlpha) return `no alpha channel (${info.pixFmt})`;
  return null;
}

async function main() {
  for (const tool of ["ffmpeg", "ffprobe"]) if (!has(tool)) { console.error(`[refetch] ${tool} not found. Install ffmpeg first.`); process.exit(1); }
  if (!has("z-ai", "--help")) { console.error("[refetch] z-ai CLI not found."); process.exit(1); }
  fs.mkdirSync(P.images, { recursive: true });
  const { rounds } = readSourceRounds();
  const progress = loadProgress();
  const broken = rounds.map((r) => [r, diagnose(r)]).filter(([, why]) => why);
  if (!broken.length) { console.log("[refetch] all images look good."); refreshRounds(); return; }
  console.log(`[refetch] ${broken.length} broken image(s)`);
  let stillBroken = 0;
  for (const [round, why] of broken) {
    console.log(`[refetch] #${round.id} ${round.heroName}: ${why}`);
    delete progress[round.id];
    saveProgress(progress);
    fs.rmSync(path.join(P.images, round.imageFile), { force: true });
    const queries = [`${round.heroName} cutout png`, `${round.heroName} render transparent`];
    let ok = false;
    for (const q of queries) {
      console.log(`    trying "${q}"`);
      const r = await fetchRound(round, q, progress);
      if (r.status === "done") { ok = true; console.log(`    ok: ${r.url}`); break; }
      console.log(`    ${r.status}${r.error ? `: ${r.error}` : ""}`);
    }
    if (!ok) {
      stillBroken++;
      console.log(`    still no transparent cutout for #${round.id}. Put your own PNG at public/images/${round.imageFile}, or edit imageQuery and re-run.`);
    }
  }
  refreshRounds();
  console.log(`[refetch] fixed ${broken.length - stillBroken}, still broken ${stillBroken}. Now run: npm run resize`);
  if (stillBroken) process.exit(1);
}

main().catch((e) => { console.error(`[refetch] ${e.message}`); process.exit(1); });
