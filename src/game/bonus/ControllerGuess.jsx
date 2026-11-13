import React from "react";
import { interpolate, spring } from "remotion";

const VB_W = 800;
const VB_H = 560;
const SIZE_W = 900; // px on screen
const SIZE_H = (SIZE_W * VB_H) / VB_W;

// Three-pronged N64-style pad, drawn from simple shapes so the silhouette and the coloured reveal share the same outline.
const Pad = ({ color }) => (
  <g fill={color} stroke={color} strokeWidth="2">
    <rect x="40" y="70" width="720" height="190" rx="95" />
    <rect x="40" y="150" width="215" height="380" rx="107" transform="rotate(7 147 150)" />
    <rect x="545" y="150" width="215" height="380" rx="107" transform="rotate(-7 653 150)" />
    <rect x="310" y="200" width="180" height="345" rx="90" />
  </g>
);

const Details = () => (
  <g>
    {/* D-pad */}
    <rect x="150" y="115" width="44" height="130" rx="10" fill="#2b2f38" />
    <rect x="107" y="158" width="130" height="44" rx="10" fill="#2b2f38" />
    {/* Start */}
    <circle cx="400" cy="140" r="20" fill="#D8352A" />
    {/* B (green) and A (blue) */}
    <circle cx="540" cy="205" r="32" fill="#2FA84F" />
    <circle cx="612" cy="245" r="38" fill="#2F6FD8" />
    {/* C buttons (yellow) */}
    {[[668, 112], [668, 188], [630, 150], [706, 150]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="17" fill="#F2C230" />)}
    {/* analog stick */}
    <circle cx="400" cy="300" r="56" fill="#3a3f4a" />
    <circle cx="400" cy="300" r="36" fill="#1d2027" />
  </g>
);

// CONTROLLER GUESS: a black controller silhouette plus four console choices. The pad pops in, choices slide up one by one, a hint
// shows with 3 s left, and on the reveal the pad turns grey with its coloured buttons while the wrong choices disappear.
export const ControllerGuess = ({ item, phase, tq, tr, fps, left }) => {
  const reveal = phase === "reveal";
  const padPop = spring({ frame: Math.max(0, Math.round(tq * fps)), fps, config: { damping: 11, stiffness: 170 } });
  const colorIn = reveal ? interpolate(tr, [0, 0.4], [0, 1], { extrapolateRight: "clamp" }) : 0;
  const chipOut = reveal ? interpolate(tr, [0, 0.3], [1, 0], { extrapolateRight: "clamp" }) : 1;
  const hintOn = !reveal && item.hint && left <= 3;
  const hintIn = hintOn ? spring({ frame: Math.round((3 - left) * fps), fps, config: { damping: 12, stiffness: 200 } }) : 0;
  const chipW = 520;
  const chipGap = 40;
  const x0 = (2560 - (4 * chipW + 3 * chipGap)) / 2;
  const letters = ["A", "B", "C", "D"];

  return (
    <>
      <div style={{ position: "absolute", left: (2560 - SIZE_W) / 2, top: 275, width: SIZE_W, height: SIZE_H, transform: `scale(${(0.6 + 0.4 * padPop).toFixed(4)})`, opacity: Math.min(1, padPop * 1.4), filter: `drop-shadow(0 0 40px ${item.accent}88)` }}>
        <svg width={SIZE_W} height={SIZE_H} viewBox={`0 0 ${VB_W} ${VB_H}`}>
          <Pad color="#000" />
          {colorIn > 0 && (
            <g opacity={colorIn}>
              <Pad color="#9aa0aa" />
              <Details />
            </g>
          )}
        </svg>
      </div>

      {/* console choices */}
      {chipOut > 0.01 && item.choices.map((c, i) => {
        const p = spring({ frame: Math.max(0, Math.round((tq - (0.6 + i * 0.25)) * fps)), fps, config: { damping: 12, stiffness: 200 } });
        return (
          <div key={i} style={{ position: "absolute", left: x0 + i * (chipW + chipGap), top: 940, width: chipW, height: 118, borderRadius: 24, border: `5px solid ${item.accent}`, background: "rgba(4,14,20,.8)", display: "flex", alignItems: "center", gap: 20, padding: "0 26px", opacity: p * chipOut, transform: `translateY(${(1 - p) * 40}px)`, boxShadow: `0 0 36px ${item.accent}44` }}>
            <span style={{ flex: "0 0 auto", width: 70, height: 70, borderRadius: "50%", background: item.accent, color: "#04121a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Big Shoulders Display',Impact,sans-serif", fontWeight: 900, fontSize: 56, lineHeight: 1 }}>{letters[i]}</span>
            <span style={{ fontFamily: "'Manrope','Segoe UI',sans-serif", fontWeight: 800, fontSize: 46, lineHeight: 1.05, color: "#fff" }}>{c}</span>
          </div>
        );
      })}

      {hintOn && (
        <div style={{ position: "absolute", left: 0, width: "100%", top: 1095, textAlign: "center", opacity: hintIn, transform: `translateY(${(1 - hintIn) * 30}px)` }}>
          <span style={{ display: "inline-block", padding: "12px 44px", borderRadius: 999, background: "rgba(0,0,0,.6)", border: "3px solid #FFD23F", fontFamily: "'Manrope','Segoe UI',sans-serif", fontWeight: 800, fontSize: 50, color: "#fff" }}>
            <span style={{ color: "#FFD23F" }}>HINT:</span> {item.hint}
          </span>
        </div>
      )}
    </>
  );
};
