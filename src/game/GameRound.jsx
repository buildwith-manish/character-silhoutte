import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { useFonts } from "../util";
import { G, getCharacter, tierOf, questionFrames } from "./config";
import { Silhouette } from "./Silhouette";

const SIL = 1000; // silhouette box (px)

// One quiz clip: question phase (silhouette + countdown) then reveal. Later steps layer the shrinking timer bar,
// zoom/reveal pop, round counter and prompts on top of this base.
export const GameRound = ({ roundId = 1 }) => {
  const frame = useCurrentFrame();
  const ready = useFonts();
  const char = getCharacter(roundId);
  const tier = tierOf(char.id);
  const fps = G.fps;
  const t = frame / fps;
  const revealT = Math.max(0, t - G.questionSeconds);
  const revealed = frame >= questionFrames;
  const secondsLeft = Math.max(0, Math.ceil(G.questionSeconds - t));

  const colorOpacity = revealed ? interpolate(revealT, [0, 0.25], [0, 1], { extrapolateRight: "clamp" }) : 0;
  const nameIn = revealed ? interpolate(revealT, [0.1, 0.45], [0, 1], { extrapolateRight: "clamp" }) : 0;

  return (
    <AbsoluteFill style={{ background: `radial-gradient(1500px 1100px at 50% 42%, ${tier.bg[0]} 0%, ${tier.bg[1]} 55%, ${tier.bg[2]} 100%)`, fontFamily: "'Manrope','Segoe UI',sans-serif", color: "#fff", opacity: ready ? 1 : 0 }}>
      {/* soft spotlight disc behind the character */}
      <div style={{ position: "absolute", left: 1280 - 620, top: 700 - 620, width: 1240, height: 1240, borderRadius: "50%", background: `radial-gradient(circle, rgba(255,255,255,.92) 0%, ${tier.accent}99 38%, rgba(0,0,0,0) 68%)`, opacity: 0.85 }} />
      {/* silhouette (black) with the colour version crossfading in on reveal */}
      <div style={{ position: "absolute", left: 1280 - SIL / 2, top: 200 }}>
        <Silhouette char={char} size={SIL} />
        <Silhouette char={char} size={SIL} color style={{ position: "absolute", left: 0, top: 0, opacity: colorOpacity }} />
      </div>

      {/* tier chip */}
      <div style={{ position: "absolute", left: 90, top: 70, padding: "14px 34px", borderRadius: 10, border: `2px solid ${tier.accent}`, background: "rgba(0,0,0,.35)", fontFamily: "'Big Shoulders Display',Impact,sans-serif", fontWeight: 900, fontSize: 56, letterSpacing: ".08em", color: tier.accent }}>
        {tier.label}
      </div>

      {/* temporary numeric countdown (replaced by the shrinking bar in step 2) */}
      {!revealed && (
        <div style={{ position: "absolute", left: 0, width: "100%", top: 1210, textAlign: "center", fontFamily: "'Big Shoulders Display',Impact,sans-serif", fontWeight: 900, fontSize: 150, lineHeight: 1 }}>
          {secondsLeft}
        </div>
      )}

      {/* answer */}
      {revealed && (
        <div style={{ position: "absolute", left: 0, width: "100%", top: 1190, textAlign: "center", opacity: nameIn, transform: `translateY(${(1 - nameIn) * 30}px)` }}>
          <div style={{ fontFamily: "'Big Shoulders Display',Impact,sans-serif", fontWeight: 900, fontSize: 150, lineHeight: 1, textTransform: "uppercase", textShadow: "0 6px 30px rgba(0,0,0,.6)" }}>{char.name}</div>
          <div style={{ marginTop: 6, fontWeight: 700, fontSize: 44, letterSpacing: ".12em", textTransform: "uppercase", color: tier.accent }}>{char.game}</div>
        </div>
      )}

      {/* audio: one tick per second (last 3 higher), impact + chime at the reveal */}
      {Array.from({ length: G.questionSeconds }, (_, k) => (
        <Sequence key={k} from={Math.round(k * fps)} durationInFrames={Math.round(fps * 0.5)}>
          <Audio src={staticFile(k >= G.questionSeconds - 3 ? "sounds/tick-high.wav" : "sounds/tick.wav")} volume={0.7} />
        </Sequence>
      ))}
      <Sequence from={questionFrames}>
        <Audio src={staticFile("sounds/impact.wav")} volume={0.55} />
        <Audio src={staticFile("sounds/chime.wav")} volume={0.7} />
      </Sequence>
    </AbsoluteFill>
  );
};
