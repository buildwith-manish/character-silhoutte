import React from "react";
import { AbsoluteFill } from "remotion";

// Backdrops used ONLY by the bonus rounds. One calm, themed backdrop per bonus type so each round has its own identity and none of
// them reads like a tier background (grid floor). Design rules, to keep the puzzle readable: low contrast, slow motion, nothing
// bright behind the centre of the frame (a soft dark pool is laid over it), no confetti / flashing bulbs.
// Everything is a pure function of `t` (seconds) so every frame is deterministic.
const W = 2560;
const H = 1440;

function lcg(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const mod = (a, n) => ((a % n) + n) % n;
const FONT = "'Big Shoulders Display',Impact,sans-serif";

// Themes: base gradient + the motif layer drawn on top.
const BASE = {
  emoji: "radial-gradient(1700px 1200px at 50% 46%, #3A1247 0%, #1C0827 55%, #08020D 100%)", // plum
  cheat: "radial-gradient(1700px 1200px at 50% 46%, #1D1458 0%, #0D0A31 55%, #04030F 100%)", // indigo
  versus: "linear-gradient(100deg, #0B3016 0%, #0A1F13 46%, #0A1A31 54%, #0A2F55 100%)", // green vs blue duel
  controller: "radial-gradient(1700px 1200px at 50% 46%, #0C2A4A 0%, #071729 55%, #02070E 100%)", // night-blue console room
  myth: "radial-gradient(1700px 1200px at 50% 46%, #2D2008 0%, #17100A 55%, #070403 100%)", // amber ink
};

// ---- emoji: soft bokeh + faint "+ = ?" symbols floating up
const BOKEH = (() => { const r = lcg(11), a = []; for (let i = 0; i < 14; i++) a.push({ x: r() * W, y0: r() * H, vy: 8 + r() * 14, rad: 90 + r() * 170, a: 0.05 + r() * 0.07, sway: 20 + r() * 40, sp: r() * 6.28 }); return a; })();
const SYMS = (() => { const r = lcg(23), a = [], g = ["+", "=", "?", "+", "?", "="]; for (let i = 0; i < 9; i++) a.push({ x: 120 + r() * (W - 240), y0: r() * (H + 300), vy: 14 + r() * 16, size: 150 + r() * 130, g: g[i % g.length], rot: (r() - 0.5) * 24 }); return a; })();

// ---- cheat: faint falling arrow columns
const ARROWS = ["↑", "↓", "←", "→", "B", "A"];
const COLS = (() => { const r = lcg(31), a = []; for (let i = 0; i < 16; i++) a.push({ x: 80 + i * ((W - 160) / 15), y0: r() * 900, vy: 40 + r() * 50, seed: Math.floor(r() * 1000), a: 0.06 + r() * 0.07 }); return a; })();

// ---- controller: faint face-button shapes drifting
const SHAPES = (() => { const r = lcg(47), a = []; for (let i = 0; i < 12; i++) a.push({ x: r() * W, y0: r() * (H + 200), vy: 10 + r() * 16, size: 70 + r() * 70, k: i % 4, rot: r() * 360, rv: (r() - 0.5) * 10 }); return a; })();

// ---- myth: faint "?" and "!" field
const MARKS = (() => { const r = lcg(59), a = []; for (let i = 0; i < 12; i++) a.push({ x: 100 + r() * (W - 200), y0: r() * (H + 300), vy: 12 + r() * 14, size: 160 + r() * 140, g: i % 2 ? "!" : "?", rot: (r() - 0.5) * 30 }); return a; })();

const drift = (y0, vy, t, span) => mod(y0 + vy * t, span) - 150;

const Motif = ({ variant, t, accent }) => {
  if (variant === "emoji") {
    return (
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }} aria-hidden="true">
        {BOKEH.map((b, i) => <circle key={i} cx={b.x + Math.sin(t * 0.2 + b.sp) * b.sway} cy={H + 200 - mod(b.vy * t + (H - b.y0), H + 400)} r={b.rad} fill={accent} opacity={b.a} />)}
        {SYMS.map((s, i) => <text key={i} x={s.x} y={H + 200 - mod(s.vy * t + (H - s.y0), H + 400)} fontFamily={FONT} fontWeight="900" fontSize={s.size} fill="#fff" opacity="0.06" textAnchor="middle" transform={`rotate(${s.rot} ${s.x} ${H / 2})`}>{s.g}</text>)}
      </svg>
    );
  }
  if (variant === "cheat") {
    return (
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }} aria-hidden="true">
        {COLS.map((c, ci) => {
          const rr = lcg(c.seed);
          return Array.from({ length: 10 }, (_, k) => {
            const y = mod(c.y0 + c.vy * t + k * 150, H + 300) - 150;
            const g = ARROWS[Math.floor(rr() * ARROWS.length)];
            const fade = 1 - Math.abs(y - H / 2) / (H / 2 + 150);
            return <text key={`${ci}-${k}`} x={c.x} y={y} fontFamily={FONT} fontWeight="900" fontSize="86" fill={accent} opacity={(c.a * Math.max(0, fade) * 1.4).toFixed(3)} textAnchor="middle">{g}</text>;
          });
        })}
      </svg>
    );
  }
  if (variant === "versus") {
    const slide = mod(t * 30, 160);
    return (
      <>
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }} aria-hidden="true">
          <defs>
            <pattern id="vs-stripes" width="160" height="160" patternUnits="userSpaceOnUse" patternTransform={`rotate(-20) translate(${slide.toFixed(1)} 0)`}>
              <rect width="60" height="160" fill="rgba(255,255,255,0.035)" />
            </pattern>
          </defs>
          <rect width={W} height={H} fill="url(#vs-stripes)" />
          {/* diagonal duel line */}
          <polygon points={`${W / 2 - 70},0 ${W / 2 + 10},0 ${W / 2 + 70},${H} ${W / 2 - 10},${H}`} fill={accent} opacity={0.10 + 0.03 * Math.sin(t * 1.6)} />
          <text x={W / 2} y={H / 2 + 260} fontFamily={FONT} fontWeight="900" fontSize="900" fill="#fff" opacity="0.035" textAnchor="middle">VS</text>
        </svg>
        <AbsoluteFill style={{ background: "radial-gradient(900px 700px at 22% 50%, rgba(61,220,100,.14), rgba(0,0,0,0) 70%), radial-gradient(900px 700px at 78% 50%, rgba(79,168,255,.16), rgba(0,0,0,0) 70%)" }} />
      </>
    );
  }
  if (variant === "controller") {
    const scan = mod(t * 90, H + 400) - 200;
    return (
      <>
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }} aria-hidden="true">
          {SHAPES.map((s, i) => {
            const y = drift(s.y0, -s.vy, t, H + 300) ;
            const tr = `translate(${s.x} ${H - mod(s.y0 + s.vy * t, H + 300) + 100}) rotate(${(s.rot + s.rv * t).toFixed(1)})`;
            const h = s.size / 2;
            const st = { fill: "none", stroke: accent, strokeWidth: 9, opacity: 0.11 };
            return (
              <g key={i} transform={tr}>
                {s.k === 0 && <circle r={h} {...st} />}
                {s.k === 1 && <path d={`M0 ${-h} L${h} ${h * 0.8} L${-h} ${h * 0.8} Z`} {...st} strokeLinejoin="round" />}
                {s.k === 2 && <path d={`M${-h} ${-h} L${h} ${h} M${h} ${-h} L${-h} ${h}`} {...st} strokeLinecap="round" />}
                {s.k === 3 && <rect x={-h} y={-h} width={s.size} height={s.size} rx="8" {...st} />}
              </g>
            );
          })}
        </svg>
        <div style={{ position: "absolute", left: 0, top: scan, width: W, height: 220, background: `linear-gradient(180deg, rgba(0,0,0,0), ${accent}14, rgba(0,0,0,0))` }} />
      </>
    );
  }
  // myth
  return (
    <>
      <AbsoluteFill style={{ background: "radial-gradient(900px 800px at 12% 50%, rgba(61,220,151,.13), rgba(0,0,0,0) 70%), radial-gradient(900px 800px at 88% 50%, rgba(255,77,94,.15), rgba(0,0,0,0) 70%)" }} />
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }} aria-hidden="true">
        {MARKS.map((m, i) => <text key={i} x={m.x} y={H + 200 - mod(m.vy * t + (H - m.y0), H + 400)} fontFamily={FONT} fontWeight="900" fontSize={m.size} fill={accent} opacity="0.07" textAnchor="middle" transform={`rotate(${m.rot} ${m.x} ${H / 2})`}>{m.g}</text>)}
      </svg>
    </>
  );
};

export const BonusBackground = ({ t = 0, accent = "#FF4FD8", variant = "emoji" }) => (
  <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden", background: BASE[variant] || BASE.emoji }}>
    <Motif variant={variant} t={t} accent={accent} />
    {/* soft dark pool behind the puzzle so text and tiles always read cleanly */}
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 1300px 760px at 50% 52%, rgba(0,0,0,.50) 0%, rgba(0,0,0,0) 100%)" }} />
    {/* thin accent frame + vignette keep it in the same family as the rest of the video */}
    <AbsoluteFill style={{ boxShadow: `inset 0 0 0 6px ${accent}55` }} />
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 50%, rgba(0,0,0,.55) 100%)" }} />
  </AbsoluteFill>
);
