import React from "react";
import { AbsoluteFill } from "remotion";

// Backdrop used ONLY by the bonus rounds, deliberately unlike the tier backgrounds (which are a grid floor on blue/purple/red/gold):
// deep teal "arcade cabinet" stage with a slowly rotating sunburst in the bonus accent, a drifting diamond pattern,
// chasing marquee bulbs around the frame and falling confetti. Pure function of `t` (seconds) so every frame is deterministic.
const W = 2560;
const H = 1440;

function lcg(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const mod = (a, n) => ((a % n) + n) % n;

const CONFETTI_COLORS = ["#FFD23F", "#3DDC97", "#4FA8FF", "#FFFFFF"];
const CONFETTI = (() => {
  const r = lcg(777), a = [];
  for (let i = 0; i < 64; i++) a.push({ x: r() * W, y0: r() * (H + 200), vy: 55 + r() * 120, size: 8 + r() * 14, rot0: r() * 360, rv: (r() - 0.5) * 220, sway: 14 + r() * 40, sf: 0.3 + r() * 0.7, sp: r() * 6.28, c: Math.floor(r() * 5), a: 0.35 + r() * 0.45 });
  return a;
})();

// Bulbs run clockwise around the frame so the chase reads as one loop.
const BULBS = (() => {
  const m = 34, step = 92, a = [];
  for (let x = m; x <= W - m; x += step) a.push([x, m]); // top, left -> right
  for (let y = m + step; y <= H - m; y += step) a.push([W - m, y]); // right, top -> bottom
  for (let x = W - m - step; x >= m; x -= step) a.push([x, H - m]); // bottom, right -> left
  for (let y = H - m - step; y > m; y -= step) a.push([m, y]); // left, bottom -> top
  return a;
})();

export const BonusBackground = ({ t = 0, accent = "#FF4FD8" }) => {
  const chase = Math.floor(t * 9);
  const shift = mod(t * 36, 120);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden", background: "radial-gradient(1600px 1150px at 50% 46%, #0E4254 0%, #072431 52%, #02090E 100%)" }}>
      {/* accent tint */}
      <AbsoluteFill style={{ background: `radial-gradient(1200px 900px at 50% 46%, ${accent}38 0%, ${accent}00 70%)` }} />

      {/* rotating sunburst behind the stage */}
      <div style={{ position: "absolute", left: W / 2 - 2200, top: 660 - 2200, width: 4400, height: 4400, transform: `rotate(${(t * 4).toFixed(2)}deg)`, background: `repeating-conic-gradient(from 0deg, ${accent} 0deg 5deg, rgba(0,0,0,0) 5deg 10deg)`, opacity: 0.14, WebkitMaskImage: "radial-gradient(circle closest-side, #000 14%, rgba(0,0,0,0) 52%)", maskImage: "radial-gradient(circle closest-side, #000 14%, rgba(0,0,0,0) 52%)" }} />

      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", left: 0, top: 0 }} aria-hidden="true">
        <defs>
          <pattern id="bonus-dm" width="120" height="120" patternUnits="userSpaceOnUse" patternTransform={`rotate(45) translate(${shift.toFixed(2)} 0)`}>
            <rect width="60" height="60" fill="rgba(255,255,255,0.045)" />
            <rect x="60" y="60" width="60" height="60" fill="rgba(255,255,255,0.045)" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#bonus-dm)" />

        {/* falling pixel confetti */}
        {CONFETTI.map((p, i) => {
          const y = mod(p.y0 + p.vy * t, H + 200) - 100;
          const x = p.x + Math.sin(t * p.sf + p.sp) * p.sway;
          const col = p.c === 4 ? accent : CONFETTI_COLORS[p.c];
          return <rect key={i} x={-p.size / 2} y={-p.size / 2} width={p.size} height={p.size} fill={col} opacity={p.a} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(p.rot0 + p.rv * t).toFixed(1)})`} />;
        })}

        {/* marquee bulbs */}
        {BULBS.map(([x, y], i) => {
          const lit = mod(i - chase, 4) === 0;
          return (
            <g key={i}>
              {lit && <circle cx={x} cy={y} r={26} fill={accent} opacity={0.28} />}
              <circle cx={x} cy={y} r={11} fill={lit ? "#FFFFFF" : accent} opacity={lit ? 1 : 0.28} />
            </g>
          );
        })}
      </svg>

      {/* CRT scanlines + vignette keep it in the same family as the rest of the video */}
      <AbsoluteFill style={{ background: "repeating-linear-gradient(0deg, rgba(0,0,0,.20) 0px, rgba(0,0,0,.20) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 6px)", opacity: 0.3, mixBlendMode: "multiply" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 50%, rgba(0,0,0,.55) 100%)" }} />
    </AbsoluteFill>
  );
};
