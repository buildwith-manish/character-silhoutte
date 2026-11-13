import React from "react";
import { interpolate, spring } from "remotion";

const GREEN = "#3DDC97";
const GOLD = "#FFD23F";
const TILE = 190;
const GAP = 36;
const TOP = 420;

// Arrow / button glyph drawn as SVG so it stays crisp at 1440p.
const Glyph = ({ k, color, size = 120 }) => {
  if (k === "A" || k === "B") {
    return <span style={{ fontFamily: "'Big Shoulders Display',Impact,sans-serif", fontWeight: 900, fontSize: size * 1.1, lineHeight: 1, color, textShadow: `0 0 30px ${color}88` }}>{k}</span>;
  }
  const rot = { U: 0, R: 90, D: 180, L: 270 }[k];
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: `rotate(${rot}deg)`, filter: `drop-shadow(0 0 14px ${color}88)` }}>
      <path d="M50 10 L88 52 L64 52 L64 90 L36 90 L36 52 L12 52 Z" fill={color} />
    </svg>
  );
};

// CHEAT CODE COMPLETE: a famous code shown as a row of button tiles with some slots missing. Tiles pop in left to right, the gaps
// pulse "?" while the clock runs, a hint shows with 3 s left, and on the reveal the missing buttons fill in one by one in green.
export const CheatCode = ({ item, phase, tq, tr, fps, left }) => {
  const reveal = phase === "reveal";
  const n = item.code.length;
  const x0 = (2560 - (n * TILE + (n - 1) * GAP)) / 2;
  const popOf = (at) => spring({ frame: Math.max(0, Math.round((tq - at) * fps)), fps, config: { damping: 11, stiffness: 190 } });
  const pulse = 1 + 0.05 * Math.sin(tq * Math.PI * 2 * 1.3);
  const hintOn = !reveal && item.hint && left <= 3;
  const hintIn = hintOn ? spring({ frame: Math.round((3 - left) * fps), fps, config: { damping: 12, stiffness: 200 } }) : 0;
  const capIn = interpolate(tq, [0.3, 0.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const blanks = item.blanks;

  return (
    <>
      {item.code.map((k, i) => {
        const isBlank = blanks.includes(i);
        const p = popOf(0.2 + i * 0.12);
        const fillAt = blanks.indexOf(i);
        const fill = reveal && isBlank ? spring({ frame: Math.max(0, Math.round((tr - 0.1 - fillAt * 0.3) * fps)), fps, config: { damping: 9, stiffness: 220 } }) : 0;
        const filled = !isBlank || fill > 0.02;
        const col = isBlank ? GREEN : "#fff";
        const border = isBlank ? (filled ? GREEN : GOLD) : item.accent;
        const scale = (0.4 + 0.6 * p) * (isBlank && !reveal ? pulse : 1) * (isBlank && reveal ? 0.9 + 0.1 * fill : 1);
        return (
          <div key={i} style={{ position: "absolute", left: x0 + i * (TILE + GAP), top: TOP, width: TILE, height: TILE, borderRadius: 40, border: `7px solid ${border}`, background: "rgba(4,14,20,.78)", boxShadow: `0 0 ${isBlank ? 60 : 36}px ${border}66`, display: "flex", alignItems: "center", justifyContent: "center", opacity: Math.min(1, p * 1.4), transform: `scale(${scale.toFixed(4)})` }}>
            {filled ? <Glyph k={k} color={col} /> : <span style={{ fontFamily: "'Big Shoulders Display',Impact,sans-serif", fontWeight: 900, fontSize: 150, lineHeight: 1, color: GOLD, textShadow: `0 0 40px ${GOLD}99` }}>?</span>}
          </div>
        );
      })}

      <div style={{ position: "absolute", left: 0, width: "100%", top: TOP + TILE + 50, textAlign: "center", opacity: capIn }}>
        <span style={{ fontFamily: "'JetBrains Mono','Menlo',monospace", fontWeight: 700, fontSize: 48, letterSpacing: ".08em", color: "rgba(255,255,255,.85)" }}>
          {reveal ? item.title : `FILL THE ${blanks.length} MISSING BUTTONS`}
        </span>
      </div>

      {hintOn && (
        <div style={{ position: "absolute", left: 0, width: "100%", top: 760, textAlign: "center", opacity: hintIn, transform: `translateY(${(1 - hintIn) * 30}px)` }}>
          <span style={{ display: "inline-block", padding: "12px 44px", borderRadius: 999, background: "rgba(0,0,0,.6)", border: "3px solid #FFD23F", fontFamily: "'Manrope','Segoe UI',sans-serif", fontWeight: 800, fontSize: 50, color: "#fff" }}>
            <span style={{ color: "#FFD23F" }}>HINT:</span> {item.hint}
          </span>
        </div>
      )}
    </>
  );
};
