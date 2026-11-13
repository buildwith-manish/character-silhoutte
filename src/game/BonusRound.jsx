import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame } from "remotion";
import { useFonts } from "../util";
import { G, bonusStartFrame, tickTimes } from "./config";
import { BonusBackground } from "./BonusBackground";
import { TimerBar } from "./TimerBar";
import { EmojiDecoder } from "./bonus/EmojiDecoder";
import { HigherLower } from "./bonus/HigherLower";
import { ControllerGuess } from "./bonus/ControllerGuess";
import { MythOrFact } from "./bonus/MythOrFact";

// Each bonus type draws only its own puzzle (the area between the prompt and the answer). Everything shared lives here:
// intro splash, chips, prompt, timer, reveal answer + fact, flash and sound.
const TYPES = { emoji: EmojiDecoder, versus: HigherLower, controller: ControllerGuess, myth: MythOrFact };

// One bonus clip: intro splash -> guessing time (timer bar) -> reveal. Look = BonusBackground, never the tier look.
export const BonusRound = ({ index = 0 }) => {
  const frame = useCurrentFrame();
  const ready = useFonts();
  const fps = G.fps;
  const B = G.bonus;
  const item = B.items[index];
  const Puzzle = TYPES[item.key];
  const t = frame / fps;
  const intro = B.introSeconds;
  const qEnd = intro + item.seconds;
  const tq = t - intro; // seconds since the timer started (negative during the intro)
  const tr = t - qEnd; // seconds since the reveal
  const phase = t < intro ? "intro" : t < qEnd ? "question" : "reveal";
  const left = Math.max(0, item.seconds - tq);
  const accent = item.accent;

  const introPop = spring({ frame, fps, config: { damping: 12, stiffness: 200 } });
  const introOut = interpolate(t, [intro - 0.25, intro], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const promptIn = phase === "intro" ? 0 : spring({ frame: Math.max(0, Math.round(tq * fps)), fps, config: { damping: 13, stiffness: 200 } });
  const flash = phase === "reveal" ? interpolate(tr, [0, 0.18], [G.motion.flashOpacity, 0], { extrapolateRight: "clamp" }) : 0;
  const answerPop = phase === "reveal" ? spring({ frame: Math.max(0, Math.round((tr - 0.05) * fps)), fps, config: { damping: 10, stiffness: 200 } }) : 0;
  const factIn = phase === "reveal" ? interpolate(tr, [0.5, 0.9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;

  return (
    <AbsoluteFill style={{ fontFamily: "'Manrope','Segoe UI',sans-serif", color: "#fff", opacity: ready ? 1 : 0 }}>
      <BonusBackground t={(bonusStartFrame(index) + frame) / fps} accent={accent} />

      {/* chips */}
      <div style={{ position: "absolute", left: 90, top: 70, padding: "14px 34px", borderRadius: 10, border: `2px solid ${accent}`, background: "rgba(0,0,0,.45)", fontFamily: "'Big Shoulders Display',Impact,sans-serif", fontWeight: 900, fontSize: 56, letterSpacing: ".08em", color: accent }}>
        {"★"} BONUS {index + 1}/{B.items.length}
      </div>
      <div style={{ position: "absolute", right: 90, top: 70, padding: "14px 34px", borderRadius: 10, background: "rgba(0,0,0,.45)", border: "2px solid rgba(255,255,255,.3)", fontFamily: "'JetBrains Mono','Menlo',monospace", fontWeight: 700, fontSize: 52, letterSpacing: ".08em" }}>
        AFTER ROUND <span style={{ color: accent }}>{item.after}</span>
      </div>

      {/* intro splash */}
      {phase === "intro" && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", textAlign: "center", opacity: introOut, fontFamily: "'Big Shoulders Display',Impact,sans-serif" }}>
          <div style={{ transform: `scale(${0.7 + 0.3 * introPop})`, opacity: introPop }}>
            <div style={{ fontWeight: 900, fontSize: 260, lineHeight: 1, letterSpacing: ".04em", color: "#fff", textShadow: `0 0 80px ${accent}, 0 8px 40px rgba(0,0,0,.7)` }}>BONUS ROUND</div>
            <div style={{ marginTop: 20, fontWeight: 900, fontSize: 150, lineHeight: 1, letterSpacing: ".06em", color: accent, textShadow: `0 0 50px ${accent}99` }}>{item.label}</div>
          </div>
        </AbsoluteFill>
      )}

      {/* prompt + puzzle */}
      {phase !== "intro" && (
        <>
          <div style={{ position: "absolute", left: 0, width: "100%", top: 175, textAlign: "center", opacity: promptIn, transform: `translateY(${(1 - promptIn) * -40}px)` }}>
            <span style={{ display: "inline-block", padding: "16px 56px", borderRadius: 999, background: "rgba(0,0,0,.62)", border: `4px solid ${accent}`, fontWeight: 800, fontSize: 78, letterSpacing: ".01em", textShadow: "0 3px 16px rgba(0,0,0,.6)" }}>{item.prompt}</span>
          </div>
          <Puzzle item={item} phase={phase} tq={tq} tr={tr} fps={fps} left={left} />
        </>
      )}

      {phase === "question" && <TimerBar t={tq} total={item.seconds} />}

      {/* reveal: answer + fact */}
      {phase === "reveal" && (
        <div style={{ position: "absolute", left: 0, width: "100%", top: 985, textAlign: "center" }}>
          <div style={{ fontFamily: "'Big Shoulders Display',Impact,sans-serif", fontWeight: 900, fontSize: 170, lineHeight: 1, textTransform: "uppercase", opacity: Math.min(1, answerPop * 1.5), transform: `scale(${(0.8 + 0.2 * answerPop).toFixed(4)})`, textShadow: "0 6px 30px rgba(0,0,0,.65)" }}>{item.answer}</div>
          <div style={{ marginTop: 6, fontWeight: 800, fontSize: 48, letterSpacing: ".12em", textTransform: "uppercase", color: accent, opacity: factIn }}>{item.sub}</div>
          <div style={{ margin: "26px auto 0", maxWidth: 2100, fontWeight: 700, fontSize: 52, lineHeight: 1.25, color: "rgba(255,255,255,.95)", textShadow: "0 3px 16px rgba(0,0,0,.7)", opacity: factIn, transform: `translateY(${(1 - factIn) * 20}px)` }}>{item.fact}</div>
        </div>
      )}

      {flash > 0.001 && <AbsoluteFill style={{ background: `rgba(255,255,255,${flash.toFixed(3)})`, pointerEvents: "none" }} />}

      {/* audio: splash whoosh + impact, ticks while the timer runs (faster at the end), impact + chime on the reveal */}
      <Sequence from={0} layout="none">
        <Audio src={staticFile("sounds/whoosh-in.wav")} volume={0.7} />
        <Audio src={staticFile("sounds/impact.wav")} volume={0.5} />
      </Sequence>
      {tickTimes(item.seconds).map((k, i) => (
        <Sequence key={i} from={Math.round((intro + k.t) * fps)} durationInFrames={Math.round(fps * 0.4)}>
          <Audio src={staticFile(k.fast ? "sounds/tick-high.wav" : "sounds/tick.wav")} volume={k.fast ? 0.85 : 0.7} />
        </Sequence>
      ))}
      <Sequence from={Math.round(qEnd * fps)} layout="none">
        <Audio src={staticFile("sounds/impact.wav")} volume={0.55} />
        <Audio src={staticFile("sounds/chime.wav")} volume={0.7} />
      </Sequence>
    </AbsoluteFill>
  );
};
