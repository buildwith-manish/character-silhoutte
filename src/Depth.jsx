// Depth layers' particle systems. All positions are pure functions of time (t, seconds) so every frame is deterministic
// and sub-frame motion-blur copies (@remotion/motion-blur) stay consistent. Design grid: 1600 x 900.
import React from "react";

function lcg(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const mod = (a, n) => ((a % n) + n) % n;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };

// ---- floating dust inside the spotlight cone (mid layer) -------------------------------------------------------------
// Cone geometry from style.js: box left 380 / top -60 / 840 x 760, clip polygon (41% 0, 59% 0, 100% 100%, 0 100%).
const CONE = { cx: 800, top: -60, h: 760, hw0: 75.6, hw1: 420 };
const DUST = (() => {
  const r = lcg(2024), a = [];
  for (let i = 0; i < 90; i++) {
    a.push({
      x0: 380 + r() * 840, y0: r() * CONE.h, vx: (r() - 0.5) * 10, vy: -(3 + r() * 13),
      wa: 4 + r() * 16, wf: 0.4 + r() * 0.9, wp: r() * 6.28, tw: 0.8 + r() * 2.4, tp: r() * 6.28,
      rad: 0.9 + Math.pow(r(), 2.2) * 3.4, a: 0.3 + r() * 0.5,
    });
  }
  return a;
})();

export const DustCone = ({ t, vis, warm, tint = [255, 214, 150] }) => {
  if (vis <= 0.01) return null;
  const R = Math.round(214 + (tint[0] - 214) * warm), G = Math.round(228 + (tint[1] - 228) * warm), B = Math.round(255 + (tint[2] - 255) * warm);
  return (
    <svg width="1600" height="900" viewBox="0 0 1600 900" style={{ position: "absolute", left: 0, top: 0, overflow: "visible", filter: "blur(0.5px)" }} aria-hidden="true">
      {DUST.map((p, i) => {
        const ph = mod(p.y0 + p.vy * t, CONE.h);
        const y = ph + CONE.top;
        const x = p.x0 + p.vx * t + Math.sin(t * p.wf + p.wp) * p.wa;
        const hw = CONE.hw0 + (CONE.hw1 - CONE.hw0) * (ph / CONE.h);
        const inCone = 1 - smooth(0.78, 1.04, Math.abs(x - CONE.cx) / hw);
        const edge = Math.min(1, ph / 70, (CONE.h - ph) / 90);
        const tw = 0.55 + 0.45 * Math.sin(t * p.tw + p.tp);
        const al = p.a * inCone * edge * tw * vis * (1.15 - 0.45 * (ph / CONE.h));
        if (al < 0.015) return null;
        return <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r={p.rad.toFixed(2)} fill={`rgba(${R},${G},${B},${al.toFixed(3)})`} />;
      })}
    </svg>
  );
};

// ---- far background motes: tiny, dim, nearly still (background layer) ------------------------------------------------
const FAR = (() => {
  const r = lcg(777), a = [];
  for (let i = 0; i < 46; i++) a.push({ x: r() * 1800 - 100, y: r() * 1000 - 50, vx: (r() - 0.5) * 5, vy: -(1 + r() * 3), rad: 0.7 + r() * 1.3, a: 0.12 + r() * 0.28, tw: 0.5 + r() * 1.6, tp: r() * 6.28 });
  return a;
})();
export const BgMotes = ({ t, vis }) => (
  <svg width="1600" height="900" viewBox="0 0 1600 900" style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} aria-hidden="true">
    {FAR.map((p, i) => {
      const x = mod(p.x + p.vx * t + 100, 1800) - 100, y = mod(p.y + p.vy * t + 50, 1000) - 50;
      const al = p.a * (0.5 + 0.5 * Math.sin(t * p.tw + p.tp)) * vis;
      return al < 0.015 ? null : <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r={p.rad.toFixed(2)} fill={`rgba(190,210,255,${al.toFixed(3)})`} />;
    })}
  </svg>
);

// ---- foreground bokeh: big, soft, out of focus, drifting faster than anything else (foreground layer) -------------------
const NEAR = (() => {
  const r = lcg(31337), a = [];
  for (let i = 0; i < 14; i++) a.push({ x: r() * 1900 - 150, y: r() * 1000 - 50, vx: -(18 + r() * 46), wy: 10 + r() * 26, wf: 0.25 + r() * 0.5, wp: r() * 6.28, size: 26 + r() * 70, blur: 3 + r() * 6, a: 0.07 + r() * 0.13, tw: 0.4 + r() * 0.9, tp: r() * 6.28, warm: r() < 0.3 });
  return a;
})();
export const FgMotes = ({ t, vis }) => (
  <>
    {NEAR.map((p, i) => {
      const x = mod(p.x + p.vx * t + 150, 1900) - 150, y = p.y + Math.sin(t * p.wf + p.wp) * p.wy;
      const al = p.a * (0.65 + 0.35 * Math.sin(t * p.tw + p.tp)) * vis;
      if (al < 0.01) return null;
      const c = p.warm ? "255,210,140" : "190,215,255";
      return (
        <div key={i} style={{ left: x, top: y, width: p.size, height: p.size, marginLeft: -p.size / 2, marginTop: -p.size / 2, borderRadius: "50%", pointerEvents: "none", filter: `blur(${p.blur.toFixed(1)}px)`,
          background: `radial-gradient(circle, rgba(${c},${al.toFixed(3)}) 0, rgba(${c},${(al * 0.45).toFixed(3)}) 55%, rgba(${c},0) 72%)` }} />
      );
    })}
  </>
);

// ---- reveal burst: golden sparks flying out of the hero's chest, streaked along their velocity -------------------------------
const BURST = (() => {
  const r = lcg(4242), a = [];
  for (let i = 0; i < 34; i++) a.push({ ang: (i / 34) * Math.PI * 2 + (r() - 0.5) * 0.35, spd: 380 + r() * 820, w: 2 + r() * 3.2, life: 0.8 + r() * 0.7, hot: r() < 0.35 });
  return a;
})();
export const Burst = ({ t, t0, cx, cy, rgb = "255,181,61", hot = "255,244,214", mid = "255,196,90" }) => {
  const tb = t - t0;
  if (tb < 0 || tb > 1.6) return null;
  const K = 3.2; // exponential drag
  return (
    <>
      {BURST.map((p, i) => {
        const u = tb / p.life;
        if (u >= 1) return null;
        const dist = (p.spd * (1 - Math.exp(-K * tb))) / K, v = p.spd * Math.exp(-K * tb);
        const len = clamp(v * 0.05, 4, 90);
        const x = cx + Math.cos(p.ang) * dist, y = cy + Math.sin(p.ang) * dist;
        const al = Math.pow(1 - u, 1.4);
        return (
          <div key={i} style={{ left: x - len, top: y - p.w / 2, width: len, height: p.w, borderRadius: p.w, pointerEvents: "none", opacity: Number(al.toFixed(3)),
            transformOrigin: `${len}px 50%`, transform: `rotate(${((p.ang * 180) / Math.PI).toFixed(1)}deg)`,
            background: `linear-gradient(90deg, rgba(${rgb},0), ${p.hot ? `rgba(${hot},1)` : `rgba(${mid},.95)`})`,
            boxShadow: `0 0 ${p.w * 3}px rgba(${mid},.7)` }} />
        );
      })}
    </>
  );
};
