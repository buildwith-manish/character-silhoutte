#!/usr/bin/env node
// Splits the GameVideo composition into N frame ranges for the parallel render workflow.
// usage: node scripts/game-plan.js <chunks>   -> prints JSON; also writes total/matrix to $GITHUB_OUTPUT when set.
// The total comes from the SAME timing code the composition uses (src/game/config.js), so voiceover lengths are included.
const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");

const out = path.join(require("os").tmpdir(), "game-config.cjs");
esbuild.buildSync({ entryPoints: [path.join(__dirname, "../src/game/config.js")], bundle: true, platform: "node", format: "cjs", outfile: out, loader: { ".json": "json" }, logLevel: "silent" });
const c = require(out);

let total = 0;
for (let id = 1; id <= c.G.total; id++) total += c.framesFor(id);
for (let i = 0; i < c.G.stingers.length; i++) total += c.stingerFramesFor(i);

const wanted = Math.max(1, Math.min(Number(process.argv[2]) || 40, 60));
const n = Math.min(wanted, Math.ceil(total / 60)); // never chunks shorter than ~1 s
const size = Math.ceil(total / n);
const matrix = [];
for (let i = 0; i < n; i++) {
  const a = i * size;
  const b = Math.min(total - 1, a + size - 1);
  if (a > b) break;
  matrix.push({ i: String(i + 1).padStart(3, "0"), a, b });
}
const info = { total, fps: c.G.fps, seconds: +(total / c.G.fps).toFixed(1), chunks: matrix.length, framesPerChunk: size, matrix };
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `total=${total}\nmatrix=${JSON.stringify(matrix)}\n`);
console.log(JSON.stringify({ ...info, matrix: undefined }));
if (!process.env.GITHUB_OUTPUT) console.log(JSON.stringify(matrix.slice(0, 3)) + " ...");
