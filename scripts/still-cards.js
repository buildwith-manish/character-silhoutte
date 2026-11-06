#!/usr/bin/env node
// Stills of the three long-video cards (intro / recap / outro) at their key moments -> out/stills/card-<name>-<seconds>s.png
//   npm run still:cards            (add --scale 0.5 for quick, smaller stills)
const fs = require("fs");
const path = require("path");
const { P, flag, refreshRounds } = require("./lib");

(async () => {
  refreshRounds();
  const { bundle } = require("@remotion/bundler");
  const { renderStill, selectComposition } = require("@remotion/renderer");
  const scale = Number(flag("scale", 1)) || 1;
  const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE || undefined;
  const plan = { Teaser: [0.1, 0.65, 1.3, 1.8], Intro: [0.1, 0.5, 1.4, 2.0, 2.6], Recap: [0.3, 1.2, 2.4, 3.6], Outro: [0.4, 1.3, 3.2, 5.4, 7.7] };
  const serveUrl = await bundle({ entryPoint: path.join(P.root, "src", "index.js") });
  const dir = path.join(P.out, "stills");
  fs.mkdirSync(dir, { recursive: true });
  for (const [id, secs] of Object.entries(plan)) {
    const comp = await selectComposition({ serveUrl, id, browserExecutable });
    for (const s of secs) {
      const out = path.join(dir, `card-${id.toLowerCase()}-${s}s.png`);
      await renderStill({ composition: comp, serveUrl, output: out, frame: Math.min(comp.durationInFrames - 1, Math.round(s * comp.fps)), scale, browserExecutable });
      console.log(`[still] ${path.relative(P.root, out)}`);
    }
  }
})().catch((e) => { console.error(e); process.exit(1); });
