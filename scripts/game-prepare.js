#!/usr/bin/env node
// Game-character quiz prep. Writes src/game/characters.generated.json = { images: {file: bool}, vo: {clipId: seconds} }.
//  - images: which silhouette PNGs exist in public/game/ (missing ones render a placeholder)
//  - vo:     voiceover clips found in clips_game/ (same NNN_<id>.wav naming as the main pipeline, e.g. 003_g01_question.wav
//            -> clip id g01_question). Durations are measured here; the clips are copied to public/game-vo/<id>.wav (git-ignored)
//            so Remotion can play them. The video stretches itself to fit them (see src/game/config.js -> timeline()).
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { probeAudioSeconds } = require("./lib");

const root = path.join(__dirname, "..");
const chars = JSON.parse(fs.readFileSync(path.join(root, "src/game/characters.json"), "utf8"));
const cfgSrc = fs.readFileSync(path.join(root, "src/game/config.js"), "utf8");
const num = (re, d) => { const m = cfgSrc.match(re); return m ? Number(m[1]) : d; };
const MAX_PRE = num(/maxPreRoll:\s*([\d.]+)/, 3);
const Q_START = num(/qStart:\s*([\d.]+)/, 0.3);

const images = {};
for (const c of chars) images[c.imageFile] = fs.existsSync(path.join(root, "public/game", c.imageFile));

const clipsDir = path.join(root, "clips_game");
const voDir = path.join(root, "public/game-vo");

// If clips_game/ is missing or empty, unpack clips.7z (committed in the repo root) into it. Tries a 7z binary first, then py7zr.
const hasWavs = (d) => fs.existsSync(d) && fs.statSync(d).isDirectory() && fs.readdirSync(d).some((n) => /\.wav$/i.test(n));
const archive = path.join(root, "clips.7z");
if (!hasWavs(clipsDir) && fs.existsSync(archive)) {
  const tmp = fs.mkdtempSync(path.join(root, ".clips-extract-"));
  let ok = false;
  for (const bin of ["7z", "7zz", "7za", "7zr"]) {
    const r = spawnSync(bin, ["x", "-y", `-o${tmp}`, archive], { stdio: "ignore" });
    if (!r.error && r.status === 0) { ok = true; break; }
  }
  if (!ok) {
    const py = "import sys, py7zr; py7zr.SevenZipFile(sys.argv[1]).extractall(sys.argv[2])";
    for (const bin of ["python3", "python"]) {
      const r = spawnSync(bin, ["-c", py, archive, tmp], { stdio: "ignore" });
      if (!r.error && r.status === 0) { ok = true; break; }
    }
  }
  if (ok) {
    fs.mkdirSync(clipsDir, { recursive: true });
    const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.wav$/i.test(e.name)) fs.copyFileSync(p, path.join(clipsDir, e.name)); // flatten: clips/x.wav -> clips_game/x.wav
    });
    walk(tmp);
    console.log("[game] extracted clips.7z -> clips_game/");
  } else {
    console.error("[game] ⚠ could not extract clips.7z — install 7-Zip (7z) or `pip install py7zr`, or unpack it into clips_game/ yourself");
  }
  fs.rmSync(tmp, { recursive: true, force: true });
}

// Clips that are in clips.7z but must NOT be used. Round 50 is unresolved on purpose, so its spoken reveal (Ghost) is never played.
const SKIP = new Set(["g50_reveal"]);
const vo = {};
if (fs.existsSync(clipsDir) && fs.statSync(clipsDir).isDirectory()) {
  fs.rmSync(voDir, { recursive: true, force: true });
  fs.mkdirSync(voDir, { recursive: true });
  for (const name of fs.readdirSync(clipsDir)) {
    if (!/\.wav$/i.test(name)) continue;
    const base = name.replace(/\.wav$/i, "");
    const id = base.replace(/^\d+_/, ""); // strip an optional NNN_ prefix: 003_g02_question.wav and g02_question.wav both work
    if (SKIP.has(id)) continue;
    const s = probeAudioSeconds(path.join(clipsDir, name));
    if (s == null) continue;
    vo[id] = Math.round(s * 1000) / 1000;
    fs.copyFileSync(path.join(clipsDir, name), path.join(voDir, `${id}.wav`));
  }
}

fs.writeFileSync(path.join(root, "src/game/characters.generated.json"), JSON.stringify({ images, vo }, null, 2) + "\n");

const haveImg = Object.values(images).filter(Boolean).length;
console.log(`[game] ${haveImg}/${chars.length} character PNGs in public/game/`);
if (haveImg < chars.length) console.log("[game] missing: " + chars.filter((c) => !images[c.imageFile]).map((c) => c.imageFile).join(", "));

const pad = (n) => String(n).padStart(2, "0");
let q = 0, r = 0;
const warn = [];
for (const c of chars) {
  const qd = vo[`g${pad(c.id)}_question`], rd = vo[`g${pad(c.id)}_reveal`];
  if (qd != null) { q++; if (c.id !== 1 && Q_START + qd > MAX_PRE) warn.push(`round ${c.id} (${c.name}): question clip is ${qd.toFixed(2)} s, timer start is capped at ${MAX_PRE} s — shorten it to ~1.5 s`); }
  if (rd != null) r++;
}
const st = [1, 2, 3].filter((n) => vo[`stinger_${n}`] != null).length;
const bn = ["emoji", "versus", "controller", "myth", "cheat"].reduce((n, k) => n + (vo[`bonus_${k}_question`] != null) + (vo[`bonus_${k}_reveal`] != null), 0);
if (Object.keys(vo).length) console.log(`[game] voiceover: ${q}/50 question, ${r}/50 reveal, ${st}/3 stinger, ${bn}/10 bonus, intro ${vo.intro != null ? "yes" : "NO"}, outro ${vo.outro != null ? "yes" : "NO"} (public/game-vo/)`);
else console.log("[game] no voiceover clips in clips_game/ — the video renders with the default timing (6 s countdown + 2 s reveal)");
if (warn.length) console.error("\n⚠  VOICEOVER TIMING WARNINGS\n  ! " + warn.join("\n  ! ") + "\n");
