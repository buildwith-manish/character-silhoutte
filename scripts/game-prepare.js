#!/usr/bin/env node
// Game-character quiz: checks which silhouette PNGs exist in public/game/ and writes src/game/characters.generated.json
// ({ "mario.png": true, ... }). Characters without a PNG render a placeholder silhouette so the Studio never breaks.
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const chars = JSON.parse(fs.readFileSync(path.join(root, "src/game/characters.json"), "utf8"));
const flags = {};
for (const c of chars) flags[c.imageFile] = fs.existsSync(path.join(root, "public/game", c.imageFile));
fs.writeFileSync(path.join(root, "src/game/characters.generated.json"), JSON.stringify(flags, null, 2) + "\n");
const have = Object.values(flags).filter(Boolean).length;
console.log(`[game] ${have}/${chars.length} character PNGs found in public/game/`);
if (have < chars.length) console.log("[game] missing: " + chars.filter((c) => !flags[c.imageFile]).map((c) => c.imageFile).join(", "));
