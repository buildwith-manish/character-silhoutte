import React from "react";
import { interpolate, spring } from "remotion";
import { G, promptFor } from "./config";

// Subtle score counter, top-right, on every question round.
export const RoundCounter = ({ id, accent }) => (
  <div style={{ position: "absolute", right: 90, top: 70, padding: "14px 34px", borderRadius: 10, background: "rgba(0,0,0,.35)", border: "2px solid rgba(255,255,255,.3)", fontFamily: "'JetBrains Mono','Menlo',monospace", fontWeight: 700, fontSize: 52, letterSpacing: ".08em", color: "#fff" }}>
    ROUND: <span style={{ color: accent }}>{id}</span>/{G.total}
  </div>
);

// Micro-challenge banner shown during the question phase of every few rounds. Pops in at fromSeconds, leaves with the countdown.
export const PromptBanner = ({ id, t, fps, accent }) => {
  const text = promptFor(id);
  if (!text) return null;
  const from = G.prompts.fromSeconds;
  if (t < from || t >= G.questionSeconds) return null;
  const pop = spring({ frame: Math.round((t - from) * fps), fps, config: { damping: 13, stiffness: 200 } });
  const out = interpolate(t, [G.questionSeconds - 0.2, G.questionSeconds], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: 0, width: "100%", top: 180, textAlign: "center", opacity: pop * out, transform: `translateY(${(1 - pop) * -40}px)` }}>
      <span style={{ display: "inline-block", padding: "14px 44px", borderRadius: 999, background: "rgba(0,0,0,.6)", border: `3px solid ${accent}`, fontFamily: "'Manrope','Segoe UI',sans-serif", fontWeight: 800, fontSize: 56, letterSpacing: ".01em", color: "#fff", textShadow: "0 3px 16px rgba(0,0,0,.6)" }}>
        {text}
      </span>
    </div>
  );
};
