#!/usr/bin/env node
// ffmpeg: normalise every public/images/*.png to 1280x720, scale-to-fit, pad with TRANSPARENT background, keep alpha (rgba PNG).
// Images already 1280x720 rgba are skipped. Images with no alpha channel are NOT converted (they would become
// opaque rectangles); they are left for `npm run refetch`.
const fs = require("fs");
const path = require("path");
const { P, refreshRounds, run, has, probeImage } = require("./lib");

const W = 1280, H = 720;
if (!has("ffmpeg") || !has("ffprobe")) { console.error("[resize] ffmpeg/ffprobe not found. Install ffmpeg first."); process.exit(1); }
if (!fs.existsSync(P.images)) { console.log("[resize] public/images does not exist yet. Run npm run fetch first."); process.exit(0); }

const files = fs.readdirSync(P.images).filter((f) => /\.png$/i.test(f) && !f.startsWith("."));
let resized = 0, skipped = 0, needRefetch = 0, failed = 0;
for (const f of files) {
  const file = path.join(P.images, f);
  const info = probeImage(file);
  if (!info) { console.log(`[resize] ${f}: unreadable, left for refetch`); needRefetch++; continue; }
  if (!info.hasAlpha) { console.log(`[resize] ${f}: no alpha channel, left for refetch`); needRefetch++; continue; }
  if (info.width === W && info.height === H && info.pixFmt === "rgba") { skipped++; continue; }
  const tmp = path.join(P.images, `.resize-${f}`);
  const vf = `scale=${W}:${H}:force_original_aspect_ratio=decrease,format=rgba,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=black@0`;
  const r = run("ffmpeg", ["-y", "-v", "error", "-i", file, "-vf", vf, "-frames:v", "1", "-pix_fmt", "rgba", tmp]);
  if (r.status !== 0) { console.log(`[resize] ${f}: ffmpeg failed: ${(r.stderr || "").trim().slice(0, 200)}`); fs.rmSync(tmp, { force: true }); failed++; continue; }
  fs.renameSync(tmp, file);
  resized++;
  console.log(`[resize] ${f}: ${info.width}x${info.height} -> ${W}x${H}`);
}
refreshRounds();
console.log(`[resize] resized ${resized}, already normalised ${skipped}, need refetch ${needRefetch}, failed ${failed}`);
if (failed) process.exit(1);
