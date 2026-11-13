import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame } from "remotion";
import { useFonts } from "../util";
import { G, getCharacter, tierOf, tickTimes, timeline, qClipId, rClipId, voSrc, roundStartFrame, INTRO_CLIP, OUTRO_CLIP } from "./config";
import { GameBackground } from "./GameBackground";
import { TimerBar } from "./TimerBar";
import { PromptBanner, RoundCounter } from "./Overlays";
import { FinalCard } from "./FinalCard";
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
  // voiceover-aware timeline: question line (pre-roll) -> timer -> reveal (stretches to fit the reveal line)
  const TL = timeline(char.id);
  const V = G.voice;
  const questionFrames = Math.round(TL.qEnd * fps);
  const tq = t - TL.pre; // seconds since the timer started (negative while the question is being read)
  const revealT = Math.max(0, t - TL.qEnd);
  const isFinal = TL.isFinal; // unresolved final round: no answer, fade to the comment-driver card
  const revealed = frame >= questionFrames && !isFinal;
  const afterQ = frame >= questionFrames;

  const colorOpacity = revealed ? interpolate(revealT, [0, 0.25], [0, 1], { extrapolateRight: "clamp" }) : 0;
  const revealT0 = revealT;
  const M = G.motion;
  // question: slow, steady zoom-in. reveal: snap to the peak, then spring back to the settle scale.
  const slowZoom = interpolate(t, [0, TL.qEnd], [M.zoomFrom, M.zoomTo], { extrapolateRight: "clamp" });
  const snapIn = interpolate(revealT, [0, M.punchSeconds], [M.zoomTo, M.punchPeak], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const settle = spring({ frame: Math.max(0, frame - questionFrames - Math.round(M.punchSeconds * fps)), fps, config: { damping: 11, stiffness: 140 } });
  const camScale = !revealed ? slowZoom : revealT < M.punchSeconds ? snapIn : M.punchPeak + (M.punchSettle - M.punchPeak) * settle;
  const flash = revealed ? interpolate(revealT, [0, 0.18], [M.flashOpacity, 0], { extrapolateRight: "clamp" }) : 0;
  const namePop = revealed ? spring({ frame: Math.max(0, frame - questionFrames - 4), fps, config: { damping: 10, stiffness: 200 } }) : 0;
  const nameIn = revealed ? interpolate(revealT, [0.1, 0.45], [0, 1], { extrapolateRight: "clamp" }) : 0;

  return (
    <AbsoluteFill style={{ background: `radial-gradient(1500px 1100px at 50% 42%, ${tier.bg[0]} 0%, ${tier.bg[1]} 55%, ${tier.bg[2]} 100%)`, fontFamily: "'Manrope','Segoe UI',sans-serif", color: "#fff", opacity: ready ? 1 : 0 }}>
      {/* gaming backdrop: arcade grid floor, pixel stars + icons, scanlines (global time = seamless across clips) */}
      <GameBackground t={(roundStartFrame(char.id) + frame) / fps} tier={tier} />
      {/* soft spotlight disc behind the character */}
      <div style={{ position: "absolute", left: 1280 - 620, top: 700 - 620, width: 1240, height: 1240, borderRadius: "50%", background: `radial-gradient(circle, rgba(255,255,255,.92) 0%, ${tier.accent}99 38%, rgba(0,0,0,0) 68%)`, opacity: 0.85 }} />
      {/* silhouette (black) with the colour version crossfading in on reveal */}
      <div style={{ position: "absolute", left: 1280 - SIL / 2, top: 200, transform: `scale(${camScale.toFixed(4)})`, transformOrigin: "50% 45%" }}>
        <Silhouette char={char} size={SIL} />
        <Silhouette char={char} size={SIL} color style={{ position: "absolute", left: 0, top: 0, opacity: colorOpacity }} />
      </div>

      {/* tier chip */}
      <div style={{ position: "absolute", left: 90, top: 70, padding: "14px 34px", borderRadius: 10, border: `2px solid ${tier.accent}`, background: "rgba(0,0,0,.35)", fontFamily: "'Big Shoulders Display',Impact,sans-serif", fontWeight: 900, fontSize: 56, letterSpacing: ".08em", color: tier.accent }}>
        {tier.label}
      </div>

      <RoundCounter id={char.id} accent={tier.accent} />
      <PromptBanner id={char.id} t={tq} fps={fps} accent={tier.accent} />

      {!afterQ && tq >= 0 && <TimerBar t={tq} />}

      {/* answer */}
      {revealed && (
        <div style={{ position: "absolute", left: 0, width: "100%", top: 1190, textAlign: "center", opacity: nameIn, transform: `translateY(${(1 - nameIn) * 30}px) scale(${(0.82 + 0.18 * namePop).toFixed(4)})` }}>
          <div style={{ fontFamily: "'Big Shoulders Display',Impact,sans-serif", fontWeight: 900, fontSize: 150, lineHeight: 1, textTransform: "uppercase", textShadow: "0 6px 30px rgba(0,0,0,.6)" }}>{char.name}</div>
          <div style={{ marginTop: 6, fontWeight: 700, fontSize: 44, letterSpacing: ".12em", textTransform: "uppercase", color: tier.accent }}>{char.game}</div>
        </div>
      )}

      {isFinal && afterQ && <FinalCard t={revealT0} />}

      {flash > 0.001 && <AbsoluteFill style={{ background: `rgba(255,255,255,${flash.toFixed(3)})`, pointerEvents: "none" }} />}

      {/* audio: voiceover question line, then ticks from the moment the timer pops (steady, then faster in the red phase),
          then impact + chime + the reveal line (SFX duck under the voice) */}
      {TL.qd != null && (
        <Sequence from={Math.round(TL.qAt * fps)}>
          <Audio src={staticFile(voSrc(qClipId(char.id)))} volume={V.volume} />
        </Sequence>
      )}
      {TL.id1 != null && (
        <Sequence from={Math.round(V.introStart * fps)}>
          <Audio src={staticFile(voSrc(INTRO_CLIP))} volume={V.volume} />
        </Sequence>
      )}
      {tickTimes().map((k, i) => (
        <Sequence key={i} from={Math.round((TL.pre + k.t) * fps)} durationInFrames={Math.round(fps * 0.4)}>
          <Audio src={staticFile(k.fast ? "sounds/tick-high.wav" : "sounds/tick.wav")} volume={k.fast ? 0.85 : 0.7} />
        </Sequence>
      ))}
      <Sequence from={questionFrames} layout="none">
        {!isFinal && <Audio src={staticFile("sounds/impact.wav")} volume={0.55 * (TL.rd != null ? V.duckSfx : 1)} />}
        {!isFinal && <Audio src={staticFile("sounds/chime.wav")} volume={0.7 * (TL.rd != null ? V.duckSfx : 1)} />}
        {isFinal && <Audio src={staticFile("sounds/whoosh.wav")} volume={0.6} />}
        {TL.rd != null && (
          <Sequence from={Math.round(TL.rStartAt * fps)}>
            <Audio src={staticFile(voSrc(rClipId(char.id)))} volume={V.volume} />
          </Sequence>
        )}
        {TL.od != null && (
          <Sequence from={Math.round(TL.oStartAt * fps)}>
            <Audio src={staticFile(voSrc(OUTRO_CLIP))} volume={V.volume} />
          </Sequence>
        )}
      </Sequence>
    </AbsoluteFill>
  );
};
