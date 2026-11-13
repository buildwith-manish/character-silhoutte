import React from "react";
import { AbsoluteFill } from "remotion";

// Gaming-themed backdrop for the "Guess the Game Character" quiz. Sits UNDER the spotlight disc and the silhouette.
// Everything is a pure function of `t` (seconds) so every frame is deterministic. Pass the GLOBAL video time so the
// scroll and drift carry on unbroken from one round to the next instead of restarting each clip.
//
// Layers (back to front): horizon glow -> pixel stars -> arcade perspective grid floor -> drifting pixel icons -> CRT scanlines + vignette.
// Colours come from the tier (accent), so the backdrop follows EASY / MEDIUM / HARD / EXPERT automatically.

const W = 2560;
const H = 1440;
const HORIZON = 900; // y of the grid's vanishing line
const VP_X = W / 2;

function lcg(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const mod = (a, n) => ((a % n) + n) % n;

// ---- pixel sprites (1 = filled). Generic arcade shapes only. -----------------------------------------------------------
const SPRITES = {
  heart: ["0110110", "1111111", "1111111", "0111110", "0011100", "0001000"],
  sparkle: ["00100", "00100", "11111", "00100", "00100"],
  coin: ["011110", "110011", "110011", "110011", "110011", "011110"],
  dpad: ["0011100", "0011100", "1111111", "1111111", "1111111", "0011100", "0011100"],
  gem: ["00100", "01110", "11111", "01110", "00100"],
  sword: ["0000011", "0000110", "1001100", "0111000", "0110000", "1011000", "1100000"],
  block: ["1111111", "1000001", "1011101", "1010101", "1011101", "1000001", "1111111"],
};
const KINDS = Object.keys(SPRITES);

const Sprite = ({ kind, unit, color, opacity }) => {
  const rows = SPRITES[kind];
  const cells = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] === "1") cells.push(<rect key={`${x}-${y}`} x={x * unit} y={y * unit} width={unit} height={unit} />);
  });
  return <g fill={color} opacity={opacity}>{cells}</g>;
};

// ---- twinkling pixel stars (upper area, above the grid) ---------------------------------------------------------------
const STARS = (() => {
  const r = lcg(1985), a = [];
  for (let i = 0; i < 130; i++) a.push({ x: r() * W, y: r() * (HORIZON - 40), s: 4 + Math.floor(r() * 3) * 2, a: 0.25 + r() * 0.5, tw: 0.4 + r() * 1.6, tp: r() * 6.28 });
  return a;
})();

// ---- drifting pixel icons, kept to the left/right margins so the centre stays clean for the silhouette ---------------------
const ICONS = (() => {
  const r = lcg(8086), a = [];
  for (let i = 0; i < 22; i++) {
    const left = i % 2 === 0;
    a.push({
      kind: KINDS[Math.floor(r() * KINDS.length)],
      x: left ? 40 + r() * 470 : W - 510 + r() * 470,
      y0: r() * (H + 300),
      vy: -(14 + r() * 26), // slow upward drift (px/s)
      unit: 9 + Math.floor(r() * 3) * 3,
      wa: 8 + r() * 20, wf: 0.25 + r() * 0.5, wp: r() * 6.28,
      op: 0.14 + r() * 0.16,
      accent: r() < 0.7,
    });
  }
  return a;
})();

// ---- arcade perspective grid ---------------------------------------------------------------------------------------------
const GRID_ROWS = 16;
const GRID_SPEED = 0.35; // rows per second toward the viewer
const VLINES = (() => { const a = []; for (let i = -16; i <= 16; i++) a.push(i); return a; })();
const V_SPACING = 330; // px between vertical lines at the bottom edge

export const GameBackground = ({ t = 0, tier }) => {
  const accent = tier.accent;
  const phase = mod(t * GRID_SPEED, 1);
  const bottom = H + 120;
  const span = bottom - HORIZON;

  const hLines = [];
  for (let k = 0; k < GRID_ROWS + 1; k++) {
    const z = (k + phase) / GRID_ROWS; // 0 (horizon) .. 1 (viewer)
    if (z > 1) continue;
    const y = HORIZON + span * Math.pow(z, 2.3);
    const op = Math.min(1, z * 2.4) * 0.5;
    hLines.push(<line key={k} x1={0} x2={W} y1={y.toFixed(1)} y2={y.toFixed(1)} stroke={accent} strokeWidth={1 + 3 * z} opacity={op.toFixed(3)} />);
  }

  const id = `gbg-${tier.key}`;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", left: 0, top: 0 }} aria-hidden="true">
        <defs>
          <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={accent} stopOpacity="0.42" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${id}-v`} gradientUnits="userSpaceOnUse" x1="0" y1={HORIZON} x2="0" y2={bottom}>
            <stop offset="0%" stopColor={accent} stopOpacity="0" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id={`${id}-floor`} gradientUnits="userSpaceOnUse" x1="0" y1={HORIZON} x2="0" y2={H}>
            <stop offset="0%" stopColor="#000" stopOpacity="0.0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.55" />
          </linearGradient>
        </defs>

        {/* horizon glow */}
        <ellipse cx={VP_X} cy={HORIZON} rx={1500} ry={260} fill={`url(#${id}-glow)`} />

        {/* pixel stars */}
        {STARS.map((s, i) => {
          const al = s.a * (0.5 + 0.5 * Math.sin(t * s.tw + s.tp));
          return al < 0.04 ? null : <rect key={i} x={s.x.toFixed(0)} y={s.y.toFixed(0)} width={s.s} height={s.s} fill="#fff" opacity={al.toFixed(3)} />;
        })}

        {/* darker floor + grid */}
        <rect x={0} y={HORIZON} width={W} height={H - HORIZON} fill={`url(#${id}-floor)`} />
        <line x1={0} x2={W} y1={HORIZON} y2={HORIZON} stroke={accent} strokeWidth={3} opacity={0.65} />
        {VLINES.map((i) => (
          <line key={i} x1={VP_X} y1={HORIZON} x2={VP_X + i * V_SPACING} y2={bottom} stroke={`url(#${id}-v)`} strokeWidth={2.5} />
        ))}
        {hLines}

        {/* drifting pixel icons */}
        {ICONS.map((p, i) => {
          const total = H + 300;
          const y = mod(p.y0 + p.vy * t, total) - 150;
          const x = p.x + Math.sin(t * p.wf + p.wp) * p.wa;
          const edge = Math.min(1, (y + 150) / 160, (H + 150 - y) / 160);
          if (edge <= 0.02) return null;
          return (
            <g key={i} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
              <Sprite kind={p.kind} unit={p.unit} color={p.accent ? accent : "#ffffff"} opacity={(p.op * Math.min(1, edge)).toFixed(3)} />
            </g>
          );
        })}
      </svg>

      {/* CRT scanlines */}
      <AbsoluteFill style={{ background: "repeating-linear-gradient(0deg, rgba(0,0,0,.20) 0px, rgba(0,0,0,.20) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 6px)", opacity: 0.35, mixBlendMode: "multiply" }} />
      {/* vignette keeps the corners dark and the centre bright */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 48%, rgba(0,0,0,.6) 100%)" }} />
    </AbsoluteFill>
  );
};
