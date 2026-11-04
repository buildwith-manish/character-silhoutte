#!/usr/bin/env node
// Animatic: the same timing + the same soundtrack, but with every decoration switched off (no motif, dust, grain, flare, rays,
// motion blur). Only the simple shapes, the type and a timecode / phase label are left. Use it to lock timing and sound BEFORE polish,
// and to review frame by frame (the label shows seconds + frame number).
//   npm run animatic -- --id 12 [--hook B]
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { P, refreshRounds, flag, bin, useShell } = require("./lib");

const { rounds } = refreshRounds();
const idArg = flag("id", null);
const round = idArg && idArg !== true ? rounds.find((r) => String(r.id) === String(idArg)) : rounds[0];
if (!round) { console.error("[animatic] round not found"); process.exit(1); }
const hook = flag("hook", null);
fs.mkdirSync(path.join(P.out, ".props"), { recursive: true });
const props = path.join("out", ".props", `animatic-${round.id}.json`);
fs.writeFileSync(path.join(P.root, props), JSON.stringify({ roundId: round.id, animatic: true, motionBlur: false, ...(hook && hook !== true ? { hookVariant: hook } : {}) }));
const out = path.join("out", `animatic-${round.id}.mp4`);
const r = spawnSync(bin("npx"), ["remotion", "render", "src/index.js", "Round", out, `--props=${props}`, "--scale=0.5", "--crf=28"], { cwd: P.root, stdio: "inherit", shell: useShell });
if (r.status !== 0) { console.error("[animatic] render failed"); process.exit(1); }
console.log(`[animatic] wrote ${out}`);
