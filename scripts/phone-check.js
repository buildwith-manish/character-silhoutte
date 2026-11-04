#!/usr/bin/env node
// Phone-size legibility check.
//   npm run phone            prints the effective on-screen size of every type size at common phone widths
//   (and, if out/stills exists and ffmpeg is installed) writes phone-size copies of the stills to out/phone/
// The design grid is 1600 px wide. A 16:9 video shown full-width on a portrait phone is only ~390 px wide, so 28 design-px text
// becomes ~7 px. Landscape / full-screen (~844 px) is much kinder. Always confirm on a real phone, sound off AND on.
const fs = require("fs");
const path = require("path");
const { P, has, run } = require("./lib");

const st = JSON.parse(fs.readFileSync(P.settings, "utf8"));
const widths = [["portrait, video full-width (390 px)", 390], ["landscape / full-screen (844 px)", 844]];
const MIN_PX = 9; // rough floor for comfortable reading of bold display text
console.log("type size   role                                  " + widths.map(([n]) => n).join("   "));
const roles = { xl: "hero name, countdown number, +1", l: "question prompt", m: "hint / fact / CTA text, real name", s: "header, watermark, labels, tracker" };
let warn = 0;
for (const k of ["xl", "l", "m", "s"]) {
  const cols = widths.map(([, w]) => { const px = (st.type[k] / 1600) * w; if (px < MIN_PX) warn++; return `${px.toFixed(1)} px${px < MIN_PX ? " (!)" : ""}`.padEnd(36); });
  console.log(`${String(k).padEnd(3)} ${String(st.type[k]).padEnd(4)}  ${roles[k].padEnd(38)}${cols.join("   ")}`);
}
if (warn) console.log(`\n(!) = under ~${MIN_PX} px. Fine in landscape / full-screen; in a portrait feed it will be small. Raise settings.json -> type or re-frame for 9:16 if your audience is portrait-first.`);

const dir = path.join(P.out, "stills");
if (fs.existsSync(dir) && has("ffmpeg")) {
  const out = path.join(P.out, "phone");
  fs.mkdirSync(out, { recursive: true });
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".png"));
  for (const f of files) run("ffmpeg", ["-y", "-v", "error", "-i", path.join(dir, f), "-vf", "scale=390:-1:flags=lanczos", path.join(out, f)]);
  console.log(`\n[phone] wrote ${files.length} phone-size stills to out/phone/ - open them at 100% (or send to your phone).`);
} else {
  console.log("\n[phone] run `npm run still` first (and have ffmpeg installed) to also get phone-size stills.");
}
