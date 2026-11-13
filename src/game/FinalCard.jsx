import React from "react";
import { AbsoluteFill, interpolate, spring, useVideoConfig } from "remotion";
import { G } from "./config";

// Round 50 end card: the silhouette fades to black (the answer is never shown), then the comment-driver message pops in.
// `t` = seconds since the countdown ended.
export const FinalCard = ({ t }) => {
  const { fps } = useVideoConfig();
  const F = G.final;
  const black = interpolate(t, [0, F.fadeSeconds], [0, 1], { extrapolateRight: "clamp" });
  const pop = spring({ frame: Math.max(0, Math.round((t - F.fadeSeconds * 0.6) * fps)), fps, config: { damping: 13, stiffness: 160 } });
  return (
    <AbsoluteFill style={{ background: `rgba(0,0,0,${black.toFixed(3)})`, alignItems: "center", justifyContent: "center", textAlign: "center", fontFamily: "'Big Shoulders Display',Impact,sans-serif" }}>
      <div style={{ opacity: pop, transform: `scale(${0.85 + 0.15 * pop})`, maxWidth: 2000 }}>
        <div style={{ fontWeight: 900, fontSize: 190, lineHeight: 1, textTransform: "uppercase", color: "#FFC83D", textShadow: "0 0 60px rgba(255,200,61,.5)" }}>{F.kicker}</div>
        <div style={{ marginTop: 44, fontFamily: "'Manrope','Segoe UI',sans-serif", fontWeight: 800, fontSize: 76, lineHeight: 1.2, color: "#fff" }}>{F.text}</div>
      </div>
    </AbsoluteFill>
  );
};
