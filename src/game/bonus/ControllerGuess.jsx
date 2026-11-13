import React from "react";
import { Img, interpolate, spring, staticFile } from "remotion";

const SIZE_W = 860; // px on screen (the PNG is ~1.08:1)
const SIZE_H = 640;

// CONTROLLER GUESS: a black controller silhouette plus four console choices. The pad pops in, choices slide up one by one, a hint
// shows with 3 s left, and on the reveal the PNG crossfades from solid black to full colour while the wrong choices disappear.
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
      <div style={{ position: "absolute", left: (2560 - SIZE_W) / 2, top: 290, width: SIZE_W, height: SIZE_H, transform: `scale(${(0.6 + 0.4 * padPop).toFixed(4)})`, opacity: Math.min(1, padPop * 1.4), filter: `drop-shadow(0 0 40px ${item.accent}88)` }}>
        <Img src={staticFile(item.image)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", filter: "brightness(0)", opacity: 1 - colorIn }} />
        <Img src={staticFile(item.image)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", opacity: colorIn }} />
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
