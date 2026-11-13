import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { useFonts } from "../util";
import { G, tierByKey, stingerClipId, stingerSecondsFor, stingerStartFrame, voDuration, voSrc } from "./config";
import { GameBackground } from "./GameBackground";

// 1-second full-screen "level up" card between tiers. Uses the colours of the tier the viewer is ENTERING.
export const Stinger = ({ index = 0 }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const len = durationInFrames / fps;
  const hasVo = voDuration(stingerClipId(index)) != null;
  const ready = useFonts();
  const s = G.stingers[index] || G.stingers[0];
  const tier = tierByKey(s.next);
  const warn = s.kicker === "WARNING";
  const t = frame / fps;
  const pop = spring({ frame, fps, config: { damping: 12, stiffness: 220 } });
  const wipe = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  const out = interpolate(t, [len - 0.12, len], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const blink = warn ? (Math.sin(t * Math.PI * 2 * 6) > 0 ? 1 : 0.6) : 1;
  return (
    <AbsoluteFill style={{ opacity: ready ? out : 0, background: `radial-gradient(1500px 1100px at 50% 45%, ${tier.bg[0]} 0%, ${tier.bg[1]} 55%, ${tier.bg[2]} 100%)`, fontFamily: "'Big Shoulders Display',Impact,sans-serif", color: "#fff", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
      <GameBackground t={(stingerStartFrame(index) + frame) / fps} tier={tier} />
      {/* diagonal accent bands sweeping in */}
      <div style={{ position: "absolute", left: 0, top: 560, width: `${wipe * 100}%`, height: 14, background: tier.accent, boxShadow: `0 0 40px ${tier.accent}` }} />
      <div style={{ position: "absolute", right: 0, top: 870, width: `${wipe * 100}%`, height: 14, background: tier.accent, boxShadow: `0 0 40px ${tier.accent}` }} />
      <div style={{ transform: `scale(${0.75 + 0.25 * pop})`, opacity: pop, maxWidth: 2200 }}>
        <div style={{ fontWeight: 900, fontSize: 210, letterSpacing: ".04em", lineHeight: 1, color: warn ? "#FF4D5E" : tier.accent, opacity: blink, textShadow: `0 0 60px ${warn ? "#FF4D5E" : tier.accent}99` }}>
          {warn ? "\u26A0 " : ""}{s.kicker}
        </div>
        <div style={{ marginTop: 30, fontWeight: 800, fontSize: 112, lineHeight: 1.05, textTransform: "uppercase", textShadow: "0 6px 30px rgba(0,0,0,.7)" }}>{s.title}</div>
      </div>
      <Sequence from={0}>
        <Audio src={staticFile("sounds/whoosh-in.wav")} volume={0.7} />
        <Audio src={staticFile("sounds/impact.wav")} volume={0.5} />
      </Sequence>
      {hasVo && (
        <Sequence from={Math.round(0.05 * fps)}>
          <Audio src={staticFile(voSrc(stingerClipId(index)))} volume={G.voice.volume} />
        </Sequence>
      )}
    </AbsoluteFill>
  );
};
