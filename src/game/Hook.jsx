import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { G, getCharacter } from "./config";
import { Silhouette } from "./Silhouette";

// "Micro-hook" overlay, played over Round 1 from frame 0 (no logo, no intro card, no greeting):
//  1. bold headline over the live round, 2. a 1-second corner teaser of an impossible Expert silhouette.
export const Hook = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const h = G.hook;

  const headIn = spring({ frame, fps, config: { damping: 14, stiffness: 180 } });
  const headOut = interpolate(t, [h.headlineSeconds - 0.3, h.headlineSeconds], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const tt = t - h.teaserFrom;
  const teaserIn = spring({ frame: Math.max(0, Math.round(tt * fps)), fps, config: { damping: 12, stiffness: 220 } });
  const teaserOut = interpolate(tt, [h.teaserSeconds - 0.2, h.teaserSeconds], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const showTeaser = tt >= 0 && tt <= h.teaserSeconds;
  const teaserChar = getCharacter(h.teaserRound);

  return (
    <AbsoluteFill style={{ pointerEvents: "none", fontFamily: "'Big Shoulders Display',Impact,sans-serif" }}>
      {t < h.headlineSeconds && (
        <div style={{ position: "absolute", left: 0, width: "100%", top: 70, textAlign: "center", opacity: headOut, transform: `translateY(${(1 - headIn) * -60}px) scale(${0.9 + 0.1 * headIn})` }}>
          <span style={{ display: "inline-block", padding: "18px 56px", background: "rgba(0,0,0,.55)", border: "3px solid #FFC83D", borderRadius: 14, fontWeight: 900, fontSize: 104, letterSpacing: ".03em", textTransform: "uppercase", color: "#fff", textShadow: "0 4px 24px rgba(0,0,0,.7)" }}>
            Can you identify all <span style={{ color: "#FFC83D" }}>50</span> gaming legends?
          </span>
        </div>
      )}
      {showTeaser && (
        <div style={{ position: "absolute", right: 70, bottom: 70, width: 520, padding: 24, borderRadius: 18, background: "rgba(8,6,2,.88)", border: "3px solid #FF4D5E", boxShadow: "0 0 60px rgba(255,77,94,.55)", opacity: teaserOut, transform: `scale(${0.6 + 0.4 * teaserIn}) rotate(${(1 - teaserIn) * 6}deg)`, transformOrigin: "100% 100%", textAlign: "center" }}>
          <Silhouette char={teaserChar} size={300} style={{ margin: "0 auto" }} />
          <div style={{ marginTop: 8, fontWeight: 900, fontSize: 56, lineHeight: 1.05, textTransform: "uppercase", color: "#fff" }}>{G.hook.teaserText}</div>
        </div>
      )}
    </AbsoluteFill>
  );
};
