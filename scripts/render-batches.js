#!/usr/bin/env node
// Renders rounds with `npx remotion render`, in batches. Resume-safe: rounds whose out/<id>.mp4 exists are skipped.
//   node scripts/render-batches.js --size 5 [--concat] [--only 12,13] [--allow-broken] [--no-blur] [--hook B]
//   --cards-only renders just the intro / recap / recap2 / outro cards (out/intro.mp4, recap.mp4, recap2.mp4, outro.mp4); --no-cards leaves them out of a full run.
//   A full run (no --only) renders the cards too and --concat joins: intro, questions (score checks after settings.structure.recap.afterQuestion and recap2.afterQuestion), outro.
//   --teaser A|B renders that teaser set (settings.json -> structure.intro.teaserSets) to out/teaser-<set>.mp4; --concat then writes out/final[-<hook>]-T<set>.mp4.
//     Rounds are reused, so an A/B teaser test only re-renders the 2-3 s teaser plus the concat.
//   --hook A|B|C renders that hook variant (settings.json -> hook.variants) to out/<id>-<variant>.mp4 / out/final-<variant>.mp4, for A/B testing the first second.
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { P, refreshRounds, has, probeImage, flag, bin, useShell } = require("./lib");

const size = Math.max(1, parseInt(flag("size", "5"), 10) || 5);
const only = flag("only", null);
const onlyIds = only && only !== true ? String(only).split(",").map(Number) : null;
const concat = flag("concat", false) === true;
const allowBroken = flag("allow-broken", false) === true;
const noBlur = flag("no-blur", false) === true; // fast draft renders: skips camera motion blur
const cardsOnly = flag("cards-only", false) === true;
const noCards = flag("no-cards", false) === true || (onlyIds && !cardsOnly); // a partial run (--only) never includes the cards
const hookArg = flag("hook", null);
const variant = hookArg && hookArg !== true ? String(hookArg) : null;
const teaserArg = flag("teaser", null);
const teaserSet = teaserArg && teaserArg !== true ? String(teaserArg) : null;

const { rounds: all } = refreshRounds();
const rounds = cardsOnly ? [] : onlyIds ? all.filter((r) => onlyIds.includes(r.id)) : all;
if (!rounds.length && !cardsOnly) { console.error("[render] no rounds to render."); process.exit(1); }

// Preflight: a hero PNG without alpha would render as a black rectangle.
if (has("ffprobe") && !allowBroken) {
  const bad = rounds.filter((r) => r.hasImage).map((r) => [r, probeImage(path.join(P.images, r.imageFile))]).filter(([, i]) => !i || !i.hasAlpha);
  if (bad.length) {
    console.error(`[render] these rounds have an image without transparency: ${bad.map(([r]) => r.id).join(", ")}`);
    console.error("         run npm run refetch (or replace the PNGs), or pass --allow-broken.");
    process.exit(1);
  }
}

fs.mkdirSync(path.join(P.out, ".props"), { recursive: true });
const batches = [];
for (let i = 0; i < rounds.length; i += size) batches.push(rounds.slice(i, i + size));
const sfx = variant ? `-${variant}` : "";
const outFile = (id) => path.join("out", `${id}${sfx}.mp4`);
let rendered = 0, skipped = 0;
const t0 = Date.now();

batches.forEach((batch, bi) => {
  console.log(`\n[render] batch ${bi + 1}/${batches.length}: rounds ${batch.map((r) => r.id).join(", ")}`);
  for (const r of batch) {
    if (fs.existsSync(path.join(P.root, outFile(r.id)))) { console.log(`[render] #${r.id} exists, skipping`); skipped++; continue; }
    const props = path.join("out", ".props", `${r.id}${sfx}.json`);
    fs.writeFileSync(path.join(P.root, props), JSON.stringify({ roundId: r.id, ...(noBlur ? { motionBlur: false } : { motionBlur: true }), ...(variant ? { hookVariant: variant } : {}) }));
    const tmp = path.join("out", `.tmp-${r.id}${sfx}.mp4`);
    console.log(`[render] #${r.id} ${r.heroName} ...`);
    const res = spawnSync(bin("npx"), ["remotion", "render", "src/index.js", "Round", tmp, `--props=${props}`], { cwd: P.root, stdio: "inherit", shell: useShell });
    if (res.status !== 0) {
      fs.rmSync(path.join(P.root, tmp), { force: true });
      console.error(`[render] FAILED on round ${r.id} (exit ${res.status}). Fix it and re-run: finished rounds are skipped.`);
      process.exit(1);
    }
    fs.renameSync(path.join(P.root, tmp), path.join(P.root, outFile(r.id)));
    rendered++;
    console.log(`[render] #${r.id} done (${rendered + skipped}/${rounds.length})`);
  }
});

console.log(`\n[render] rendered ${rendered}, skipped ${skipped}, ${((Date.now() - t0) / 1000).toFixed(0)}s`);

// ---- long-video structure cards (settings.json -> structure): Teaser, Intro, Recap (mid-video), Outro ----
const ST = JSON.parse(fs.readFileSync(P.settings, "utf8"));
const STR = ST.structure || {};
// Teaser lives under structure.intro.teaserSeconds; enabled whenever intro is enabled.
const teaserSecs = Math.max(1, (STR.intro && STR.intro.teaserSeconds) || 2);
const cardDefs = [
  // Teaser comes first; it derives its "enabled" state from intro being enabled.
  ...(!noCards && STR.intro && STR.intro.enabled !== false ? [{ key: "teaser", comp: "Teaser", dur: teaserSecs, file: path.join("out", teaserSet ? `teaser-${teaserSet}.mp4` : "teaser.mp4"), ...(teaserSet ? { props: { teaserSet } } : {}) }] : []),
  // Standard cards
  ...([["intro", "Intro", 3], ["recap", "Recap", 4.5], ["recap2", "Recap2", 4.5], ["outro", "Outro", 8]]
    .filter(([k]) => !noCards && STR[k] && STR[k].enabled !== false)
    .map(([k, comp, d]) => ({ key: k, comp, dur: Math.max(1, STR[k].seconds || d), file: path.join("out", `${k}.mp4`) }))),
];
for (const c of cardDefs) {
  if (fs.existsSync(path.join(P.root, c.file))) { console.log(`[render] ${c.key} card exists, skipping`); continue; }
  const tmp = path.join("out", `.tmp-${c.key}.mp4`);
  console.log(`[render] ${c.key} card ...`);
  const cardArgs = [];
  if (c.props) {
    const cp = path.join("out", ".props", `${c.key}-${teaserSet}.json`);
    fs.writeFileSync(path.join(P.root, cp), JSON.stringify(c.props));
    cardArgs.push(`--props=${cp}`);
  }
  const res = spawnSync(bin("npx"), ["remotion", "render", "src/index.js", c.comp, tmp, ...cardArgs], { cwd: P.root, stdio: "inherit", shell: useShell });
  if (res.status !== 0) { fs.rmSync(path.join(P.root, tmp), { force: true }); console.error(`[render] FAILED on the ${c.key} card.`); process.exit(1); }
  fs.renameSync(path.join(P.root, tmp), path.join(P.root, c.file));
}
// final order: teaser, intro, every question (recap card right after question `afterQuestion`), outro
const clipSecR = ST.questionSeconds + ST.revealSeconds + ST.wipeSeconds;
const sequence = [];
const card = (k) => cardDefs.find((c) => c.key === k);
if (card("teaser")) sequence.push({ file: card("teaser").file, dur: card("teaser").dur });
if (card("intro"))  sequence.push({ file: card("intro").file,  dur: card("intro").dur  });
let recapPlaced = !card("recap");
let recap2Placed = !card("recap2");
for (const r of rounds) {
  sequence.push({ file: outFile(r.id), dur: clipSecR });
  if (!recapPlaced && !r.type && Number(r.id) === Number(STR.recap.afterQuestion ?? 25)) { sequence.push({ file: card("recap").file, dur: card("recap").dur }); recapPlaced = true; }
  if (!recap2Placed && !r.type && Number(r.id) === Number(STR.recap2.afterQuestion ?? 40)) { sequence.push({ file: card("recap2").file, dur: card("recap2").dur }); recap2Placed = true; }
}
if (!recapPlaced) console.log(`[render] note: no question ${STR.recap.afterQuestion ?? 25} in this series, so the score-check card is not placed (it is still rendered as out/recap.mp4).`);
if (!recap2Placed) console.log(`[render] note: no question ${STR.recap2.afterQuestion ?? 40} in this series, so the second score-check card is not placed (it is still rendered as out/recap2.mp4).`);
if (card("outro")) sequence.push({ file: card("outro").file, dur: card("outro").dur });

if (concat && !sequence.length) { console.error("[render] nothing to concat."); process.exit(1); }
if (concat) {
  if (!has("ffmpeg")) { console.error("[render] ffmpeg not found, cannot concat."); process.exit(1); }
  // Video: stream-copied (no quality loss). Audio: NOT stream-copied. Every AAC clip carries its own encoder delay, so copying
  // leaves a small gap/offset at each join and the audio drifts ~7 ms per clip against the video (visible over many clips).
  // Instead each clip's audio is decoded, trimmed to the exact clip length, joined sample-accurately and encoded once.
  const clips = sequence.map((s) => path.resolve(P.root, s.file));
  const fsfx = sfx + (teaserSet ? `-T${teaserSet}` : "");
  const list = path.join(P.out, `.concat${fsfx}.txt`);
  fs.writeFileSync(list, clips.map((c) => `file '${c.replace(/\\/g, "/").replace(/'/g, "'\\''")}'`).join("\n") + "\n");
  const fg = clips.map((_, i) => `[${i + 1}:a]atrim=duration=${sequence[i].dur},asetpts=PTS-STARTPTS[a${i}]`).join(";") + ";" +
    clips.map((_, i) => `[a${i}]`).join("") + `concat=n=${clips.length}:v=0:a=1[aout]`;
  const fgFile = path.join(P.out, `.concat-filter${fsfx}.txt`);
  fs.writeFileSync(fgFile, fg);
  const args = ["-y", "-f", "concat", "-safe", "0", "-i", list];
  clips.forEach((c) => args.push("-i", c));
  args.push("-filter_complex_script", fgFile, "-map", "0:v", "-map", "[aout]", "-c:v", "copy", "-c:a", "aac", "-b:a", "320k", "-movflags", "+faststart", path.join(P.out, `final${fsfx}.mp4`));
  const res = spawnSync(bin("ffmpeg"), args, { cwd: P.root, stdio: "inherit" });
  if (res.status !== 0) { console.error("[render] concat failed."); process.exit(1); }
  console.log(`[render] wrote out/final${fsfx}.mp4`);
}
