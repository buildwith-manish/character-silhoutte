import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { useFonts } from "../util";
import { G, getCharacter, tierOf, questionFrames, tickTimes } from "./config";
import { TimerBar } from "./TimerBar";
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

      {!revealed && <TimerBar t={t} />}

      {/* answer */}
      {revealed && (
        <div style={{ position: "absolute", left: 0, width: "100%", top: 1190, textAlign: "center", opacity: nameIn, transform: `translateY(${(1 - nameIn) * 30}px)` }}>
          <div style={{ fontFamily: "'Big Shoulders Display',Impact,sans-serif", fontWeight: 900, fontSize: 150, lineHeight: 1, textTransform: "uppercase", textShadow: "0 6px 30px rgba(0,0,0,.6)" }}>{char.name}</div>
          <div style={{ marginTop: 6, fontWeight: 700, fontSize: 44, letterSpacing: ".12em", textTransform: "uppercase", color: tier.accent }}>{char.game}</div>
        </div>
      )}

      {/* audio: steady ticks, then a faster, higher-pitched tick tempo during the red phase; impact + chime at the reveal */}
      {tickTimes().map((k, i) => (
        <Sequence key={i} from={Math.round(k.t * fps)} durationInFrames={Math.round(fps * 0.4)}>
          <Audio src={staticFile(k.fast ? "sounds/tick-high.wav" : "sounds/tick.wav")} volume={k.fast ? 0.85 : 0.7} />
        </Sequence>
      ))}
      <Sequence from={questionFrames}>
        <Audio src={staticFile("sounds/impact.wav")} volume={0.55} />
        <Audio src={staticFile("sounds/chime.wav")} volume={0.7} />
      </Sequence>
    </AbsoluteFill>
  );
};
