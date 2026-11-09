#!/usr/bin/env node
// Layout check for the letter boxes (no browser needed): for every round, computes the box-row width and shrink factor
// and lists which rounds skip the boxes (settings.letterHints.skipTypes). Fails if a row would be squeezed below MIN_SCALE.
//   node scripts/check-boxes.js
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const LH = JSON.parse(fs.readFileSync(path.join(root, "settings.json"), "utf8")).letterHints;
const rounds = JSON.parse(fs.readFileSync(path.join(root, "questions.json"), "utf8"));
const MIN_SCALE = 0.7;
const ALNUM = /[\p{L}\p{N}]/u;
let bad = 0;
const skipped = [];
for (const r of rounds) {
  if (r.type && r.type !== "normal" && (LH.skipTypes || []).includes(r.type)) { skipped.push(`${r.id} ${r.heroName} (${r.type})`); continue; }
  const chars = Array.from(String(r.heroName).toUpperCase());
  const w = chars.reduce((a, ch) => a + (ALNUM.test(ch) ? LH.tileW : ch === " " ? LH.spaceW : LH.fixedW), 0) + LH.gap * (chars.length - 1);
  const scale = Math.min(1, LH.maxWidth / w);
  if (scale < MIN_SCALE) { bad++; console.log(`TOO TIGHT  ${r.id} ${r.heroName}: row ${w}px, scale ${scale.toFixed(2)}`); }
}
console.log(`[boxes] ${rounds.length - skipped.length} rounds use boxes, ${bad} too tight`);
console.log(`[boxes] skipped (old reveal): ${skipped.join(", ") || "none"}`);
process.exit(bad ? 1 : 0);
