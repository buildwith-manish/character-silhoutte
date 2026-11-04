// Impact-frame effects: chromatic-aberration filter, god rays, lens flare. Pure functions of time (design grid 1600 x 900).
import React from "react";
import { expoOut } from "./gsap-helpers";

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

// SVG filter: R and B channels pulled apart horizontally (dx px), G stays. Use as style={{ filter: "url(#qm-ca)" }}.
export const CaFilter = ({ dx, dy = 0 }) => (
  <svg width="0" height="0" style={{ position: "absolute", left: 0, top: 0 }} aria-hidden="true">
    <defs>
      <filter id="qm-ca" x="-4%" y="-4%" width="108%" height="108%" colorInterpolationFilters="sRGB">
        <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
        <feOffset in="r" dx={dx.toFixed(2)} dy={dy.toFixed(2)} result="ro" />
        <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
        <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
        <feOffset in="b" dx={(-dx).toFixed(2)} dy={(-dy).toFixed(2)} result="bo" />
        <feBlend in="ro" in2="g" mode="screen" result="rg" />
        <feBlend in="rg" in2="bo" mode="screen" />
      </filter>
    </defs>
  </svg>
);

// Radial light rays: two conic-gradient fans with different periods (so the rays look irregular) counter-rotating behind the hero.
export const Rays = ({ p, cx, cy, hot = "255,236,190" }) => {
  if (p <= 0 || p >= 1) return null;
  const op = 0.95 * Math.pow(1 - p, 1.5) * Math.min(1, p * 16);
  const sc = 0.3 + 1.3 * expoOut(clamp(p * 1.15));
  const S = 2400;
  const fan = (period, w, a) =>
    `repeating-conic-gradient(from 0deg, rgba(${hot},0) 0deg, rgba(${hot},${a}) ${w / 2}deg, rgba(${hot},0) ${w}deg ${period}deg)`;
  const mask = "radial-gradient(circle, #000 4%, rgba(0,0,0,.55) 30%, rgba(0,0,0,0) 68%)";
  const layer = (bg, rot) => ({
    position: "absolute", left: cx - S / 2, top: cy - S / 2, width: S, height: S, pointerEvents: "none", mixBlendMode: "screen",
    background: bg, WebkitMaskImage: mask, maskImage: mask, opacity: Number(op.toFixed(3)),
    transform: `scale(${sc.toFixed(3)}) rotate(${rot.toFixed(2)}deg)`,
  });
  return (
    <>
      <div style={layer(fan(14.4, 5, 0.9), p * 16)} />
      <div style={layer(fan(23, 7, 0.65), -p * 11 + 5)} />
    </>
  );
};

// Anamorphic lens flare: hot core, horizontal streak, and ghosts that slide along the axis through the frame centre.
export const LensFlare = ({ t, t0, cx, cy, rgb = "255,181,61", hot = "255,226,170" }) => {
  const p = (t - t0) / 1.05;
  if (p < 0 || p > 1) return null;
  const a = Math.pow(1 - p, 1.5);
  const e = expoOut(clamp(p * 1.2));
  const src = { x: cx + (-130 + 260 * e), y: cy + (-26 + 34 * e) }; // the "light source" drifts, so the ghosts slide
  const C = { x: 800, y: 450 };
  const ghosts = [
    { k: -0.32, s: 70, c: "120,220,255", o: 0.5 },
    { k: -0.62, s: 130, c: "255,120,200", o: 0.34 },
    { k: -0.95, s: 44, c: "255,214,130", o: 0.55 },
    { k: -1.35, s: 190, c: "130,150,255", o: 0.22 },
  ];
  const base = { position: "absolute", pointerEvents: "none", mixBlendMode: "screen" };
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1600, height: 900, pointerEvents: "none" }}>
      <div style={{ ...base, left: cx - 260, top: cy - 260, width: 520, height: 520, borderRadius: "50%", opacity: Number(a.toFixed(3)),
        background: `radial-gradient(circle, rgba(255,255,255,1) 0, rgba(${hot},.85) 12%, rgba(${rgb},.35) 34%, rgba(${rgb},0) 70%)` }} />
      <div style={{ ...base, left: cx - 900, top: cy - 5, width: 1800, height: 10, borderRadius: 10, filter: "blur(2.5px)", opacity: Number((a * 0.95).toFixed(3)),
        transform: `scaleX(${(0.25 + 0.75 * e).toFixed(3)})`,
        background: "linear-gradient(90deg, rgba(120,170,255,0), rgba(140,190,255,.85) 30%, #fff 50%, rgba(140,190,255,.85) 70%, rgba(120,170,255,0))" }} />
      <div style={{ ...base, left: cx - 3, top: cy - 160, width: 6, height: 320, borderRadius: 6, filter: "blur(3px)", opacity: Number((a * 0.5).toFixed(3)),
        transform: `scaleY(${(0.3 + 0.7 * e).toFixed(3)})`, background: "linear-gradient(180deg, rgba(255,255,255,0), #fff 50%, rgba(255,255,255,0))" }} />
      {ghosts.map((g, i) => {
        const x = C.x + (src.x - C.x) * g.k, y = C.y + (src.y - C.y) * g.k;
        return (
          <div key={i} style={{ ...base, left: x - g.s / 2, top: y - g.s / 2, width: g.s, height: g.s, borderRadius: "50%", opacity: Number((a * g.o).toFixed(3)),
            border: `2px solid rgba(${g.c},.7)`, background: `radial-gradient(circle, rgba(${g.c},.28) 0, rgba(${g.c},.08) 60%, rgba(${g.c},0) 72%)` }} />
        );
      })}
    </div>
  );
};
