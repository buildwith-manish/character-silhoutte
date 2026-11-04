#!/usr/bin/env node
// Renders stills of one round at seconds 0, 0.5, 3.33, 5, 7.33, 8.67 (hook first frame, hook mid-pull, question, hint, reveal, fact) into out/stills/.
//   npm run still -- --id 12
//   npm run still:board          one round per universe = a quick reference board of every look (grade, motif, accent, tint)
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { P, refreshRounds, flag, bin, useShell } = require("./lib");

const { rounds } = refreshRounds();
const idArg = flag("id", null);
const all = flag("all", false) === true;
const first = idArg && idArg !== true ? rounds.find((r) => String(r.id) === String(idArg)) : rounds[0];
const targets = all ? rounds.filter((r, i, a) => a.findIndex((x) => x.universe === r.universe) === i) : first ? [first] : [];
if (!targets.length) { console.error("[still] round not found"); process.exit(1); }
const FPS = JSON.parse(fs.readFileSync(P.settings, "utf8")).fps;
const frames = [0, 0.5, 3.33, 5, 7.33, 8.67].map((sec) => Math.round(sec * FPS)); // hook, hook mid-pull, question, hint, reveal, fact
fs.mkdirSync(path.join(P.out, "stills"), { recursive: true });
fs.mkdirSync(path.join(P.out, ".props"), { recursive: true });
for (const round of targets) {
const props = path.join("out", ".props", `${round.id}.json`);
fs.writeFileSync(path.join(P.root, props), JSON.stringify({ roundId: round.id }));
for (const f of frames) {
  const out = path.join("out", "stills", `round-${round.id}-frame-${f}.png`);
  const r = spawnSync(bin("npx"), ["remotion", "still", "src/index.js", "Round", out, `--frame=${f}`, `--props=${props}`], { cwd: P.root, stdio: "inherit", shell: useShell });
  if (r.status !== 0) { console.error(`[still] failed at frame ${f}`); process.exit(1); }
}
}
console.log(`[still] wrote ${frames.length * targets.length} stills to out/stills/`);
