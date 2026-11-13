import React from "react";
import { G } from "./config";

// Shrinking progress bar under the silhouette. Starts green and full, turns yellow when `yellowAtLeft` seconds remain,
// then flashes red for the last `redAtLeft` seconds. `t` = seconds since the clip started.
export const TimerBar = ({ t, width = 1400, height = 36 }) => {
  const C = G.timer;
  const left = Math.max(0, G.questionSeconds - t);
  const frac = Math.min(1, left / G.questionSeconds);
  const red = left <= C.redAtLeft;
  const yellow = !red && left <= C.yellowAtLeft;
  const base = red ? C.red : yellow ? C.yellow : C.green;
  // red phase: pulse brightness + glow on a square-ish wave
  const pulse = red ? (Math.sin(t * Math.PI * 2 * C.flashHz) > 0 ? 1 : 0.55) : 1;
  const glow = red ? 48 * pulse : 22;
  return (
    <div style={{ position: "absolute", left: (G.width - width) / 2, top: 1262, width, textAlign: "center" }}>
      <div style={{ position: "relative", width, height, borderRadius: height, background: "rgba(255,255,255,.14)", border: "2px solid rgba(255,255,255,.25)", overflow: "hidden", boxShadow: `0 0 ${glow}px ${base}88` }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${frac * 100}%`, borderRadius: height, background: base, opacity: red ? 0.45 + 0.55 * pulse : 1, boxShadow: `inset 0 -8px 14px rgba(0,0,0,.25)` }} />
      </div>
      <div style={{ marginTop: 14, fontFamily: "'Big Shoulders Display',Impact,sans-serif", fontWeight: 900, fontSize: 84, lineHeight: 1, color: base, opacity: red ? 0.6 + 0.4 * pulse : 1, textShadow: `0 0 ${glow}px ${base}aa` }}>
        {Math.ceil(left)}
      </div>
    </div>
  );
};
