import React from "react";
import { Audio, Sequence, interpolate, spring, staticFile } from "remotion";
import { G } from "../config";

const GREEN = "#3DDC97";
const GOLD = "#FFD23F";
const TILE = 190;
const GAP = 36;
const TOP = 470;
const STEP = 0.3; // seconds per button while the code is played
const PLAY_AT = 1.7; // first playback starts after the tiles have popped in
const REPEAT_GAP = 1.2; // pause between playbacks
const EMOJI_FONT = "'Noto Color Emoji','Apple Color Emoji','Segoe UI Emoji',sans-serif";

// Arrow / button glyph drawn as SVG so it stays crisp at 1440p.
const Glyph = ({ k, color, size = 120 }) => {
  if (k === "A" || k === "B") {
    return <span style={{ fontFamily: "'Big Shoulders Display',Impact,sans-serif", fontWeight: 900, fontSize: size * 1.1, lineHeight: 1, color, textShadow: `0 0 30px ${color}88` }}>{k}</span>;
  }
  const rot = { U: 0, R: 90, D: 180, L: 270 }[k];
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: `rotate(${rot}deg)`, filter: `drop-shadow(0 0 14px ${color}88)` }}>
      <path d="M50 10 L88 52 L64 52 L64 90 L36 90 L36 52 L12 52 Z" fill={color} />
    </svg>
  );
};

// CHEAT CODE COMPLETE: a famous code as keycap tiles with some slots missing. Tiles pop in left to right, then the code is PLAYED as a
// chiptune: each known button lights up with its own beep and the gaps stay silent, so viewers can follow the rhythm and shout guesses.
// A hint shows with 3 s left. On the reveal the missing buttons fill in one by one with their beeps, then a CHEAT ACTIVATED banner
// counts the lives up. Scanlines and a vignette give it a retro CRT look.
export const CheatCode = ({ item, phase, tq, tr, fps, left }) => {
  const reveal = phase === "reveal";
  const n = item.code.length;
  const x0 = (2560 - (n * TILE + (n - 1) * GAP)) / 2;
  const popOf = (at) => spring({ frame: Math.max(0, Math.round((tq - at) * fps)), fps, config: { damping: 11, stiffness: 190 } });
  const pulse = 1 + 0.05 * Math.sin(tq * Math.PI * 2 * 1.3);
  const hintOn = !reveal && item.hint && left <= 3;
  const hintIn = hintOn ? spring({ frame: Math.round((3 - left) * fps), fps, config: { damping: 12, stiffness: 200 } }) : 0;
  const capIn = interpolate(tq, [0.3, 0.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const blanks = item.blanks;
  const intro = G.bonus.introSeconds;
  const fillStep = 0.3;

  // playback cycles (start times in seconds since the timer began), as many as fit before the reveal
  const cycles = [];
  for (let s = PLAY_AT; s + n * STEP <= item.seconds - 0.2; s += n * STEP + REPEAT_GAP) cycles.push(s);
  let activeIdx = -1;
  let activeLocal = 0;
  if (!reveal) {
    for (const c of cycles) {
      const d = tq - c;
      if (d >= 0 && d < n * STEP) { activeIdx = Math.floor(d / STEP); activeLocal = (d % STEP) / STEP; }
    }
  }
  const beep = (k) => staticFile(`sounds/beep-${k.toLowerCase()}.wav`);

  // payoff banner
  const pay = item.payoff;
  const payAt = 0.1 + blanks.length * fillStep + 0.3;
  const payP = reveal && pay ? spring({ frame: Math.max(0, Math.round((tr - payAt) * fps)), fps, config: { damping: 9, stiffness: 200 } }) : 0;
  const lives = pay ? Math.round(interpolate(tr - payAt - 0.15, [0, 0.8], [pay.from, pay.to], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })) : 0;

  // hero emoji badge
  const badgePop = spring({ frame: Math.max(0, Math.round((tq - 0.1) * fps)), fps, config: { damping: 9, stiffness: 190 } });
  const bob = Math.sin(tq * Math.PI * 1.6) * 10;
  const badgeKick = payP > 0 ? 1 + 0.18 * Math.sin(Math.min(1, payP) * Math.PI) : 1;

  const revealStart = intro + item.seconds;

  return (
    <>
      {item.code.map((k, i) => {
        const isBlank = blanks.includes(i);
        const p = popOf(0.2 + i * 0.12);
        const fillAt = blanks.indexOf(i);
        const fill = reveal && isBlank ? spring({ frame: Math.max(0, Math.round((tr - 0.1 - fillAt * fillStep) * fps)), fps, config: { damping: 9, stiffness: 220 } }) : 0;
        const filled = !isBlank || fill > 0.02;
        const lit = i === activeIdx && !isBlank ? 1 - activeLocal : 0; // known button being played
        const gapBeat = i === activeIdx && isBlank ? 1 - activeLocal : 0; // silent gap being "played"
        const col = isBlank ? GREEN : "#fff";
        const border = isBlank ? (filled ? GREEN : GOLD) : item.accent;
        const scale = (0.4 + 0.6 * p) * (isBlank && !reveal ? pulse : 1) * (isBlank && reveal ? 0.9 + 0.1 * fill : 1) * (1 + 0.14 * lit);
        const glow = (isBlank ? 60 : 36) + 90 * lit + 40 * gapBeat;
        const face = lit > 0 ? `linear-gradient(180deg, ${item.accent}cc, rgba(20,10,48,.92))` : "linear-gradient(180deg, rgba(58,72,96,.95), rgba(4,14,20,.9))";
        return (
          <div key={i} style={{ position: "absolute", left: x0 + i * (TILE + GAP), top: TOP, width: TILE, height: TILE, borderRadius: 40, border: `7px solid ${border}`, background: face, boxShadow: `0 0 ${glow}px ${border}88, inset 0 7px 0 rgba(255,255,255,.2), inset 0 -12px 0 rgba(0,0,0,.4), 0 14px 0 rgba(0,0,0,.5)`, display: "flex", alignItems: "center", justifyContent: "center", opacity: Math.min(1, p * 1.4), transform: `scale(${scale.toFixed(4)})` }}>
            {filled ? <Glyph k={k} color={col} /> : <span style={{ fontFamily: "'Big Shoulders Display',Impact,sans-serif", fontWeight: 900, fontSize: 150, lineHeight: 1, color: GOLD, textShadow: `0 0 40px ${GOLD}99`, opacity: 1 - 0.35 * gapBeat }}>?</span>}
          </div>
        );
      })}

      {/* hero emoji badge above the right end of the row */}
      <div style={{ position: "absolute", left: 2200, top: 250, width: 190, height: 190, borderRadius: 95, border: `8px solid ${item.accent}`, background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,.22), rgba(20,10,48,.92) 60%)", boxShadow: `0 0 60px ${item.accent}88`, display: "flex", alignItems: "center", justifyContent: "center", opacity: Math.min(1, badgePop * 1.4), transform: `translateY(${bob}px) scale(${((0.4 + 0.6 * badgePop) * badgeKick).toFixed(4)}) rotate(${Math.sin(tq * 2) * 6}deg)` }}>
        <span style={{ fontFamily: EMOJI_FONT, fontSize: 104, lineHeight: 1 }}>{item.emoji || "🕹️"}</span>
      </div>

      <div style={{ position: "absolute", left: 0, width: "100%", top: TOP + TILE + 50, textAlign: "center", opacity: capIn }}>
        <span style={{ fontFamily: "'JetBrains Mono','Menlo',monospace", fontWeight: 700, fontSize: 48, letterSpacing: ".08em", color: "rgba(255,255,255,.85)" }}>
          {reveal ? item.title : `FILL THE ${blanks.length} MISSING BUTTONS`}
        </span>
      </div>

      {/* payoff: CHEAT ACTIVATED + lives counter */}
      {payP > 0.01 && (
        <div style={{ position: "absolute", left: 0, width: "100%", top: 800, textAlign: "center", opacity: Math.min(1, payP * 1.5), transform: `scale(${(0.7 + 0.3 * payP).toFixed(4)})` }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 40, padding: "10px 60px", borderRadius: 24, border: `8px solid ${GREEN}`, background: "rgba(4,14,20,.9)", boxShadow: `0 0 70px ${GREEN}88`, fontFamily: "'Big Shoulders Display',Impact,sans-serif", fontWeight: 900, fontSize: 110, lineHeight: 1.1, letterSpacing: ".05em", color: GREEN }}>
            <span>{pay.title}</span>
            <span style={{ color: GOLD, textShadow: `0 0 30px ${GOLD}88` }}>{pay.unit} {lives}</span>
          </span>
        </div>
      )}

      {hintOn && (
        <div style={{ position: "absolute", left: 0, width: "100%", top: 810, textAlign: "center", opacity: hintIn, transform: `translateY(${(1 - hintIn) * 30}px)` }}>
          <span style={{ display: "inline-block", padding: "12px 44px", borderRadius: 999, background: "rgba(0,0,0,.6)", border: "3px solid #FFD23F", fontFamily: "'Manrope','Segoe UI',sans-serif", fontWeight: 800, fontSize: 50, color: "#fff" }}>
            <span style={{ color: "#FFD23F" }}>HINT:</span> {item.hint}
          </span>
        </div>
      )}

      {/* retro CRT look: scanlines + vignette */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "repeating-linear-gradient(0deg, rgba(0,0,0,.16) 0px, rgba(0,0,0,.16) 2px, transparent 2px, transparent 6px)" }} />
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,.5) 100%)" }} />

      {/* chiptune: the known buttons while the clock runs (gaps stay silent), the missing ones on the reveal, a ping on activation */}
      {cycles.map((c, ci) =>
        item.code.map((k, i) => blanks.includes(i) ? null : (
          <Sequence key={`p${ci}-${i}`} from={Math.round((intro + c + i * STEP) * fps)} durationInFrames={Math.round(fps * 0.3)} layout="none">
            <Audio src={beep(k)} volume={0.55} />
          </Sequence>
        ))
      )}
      {blanks.map((bi, j) => (
        <Sequence key={`r${j}`} from={Math.round((revealStart + 0.1 + j * fillStep) * fps)} durationInFrames={Math.round(fps * 0.3)} layout="none">
          <Audio src={beep(item.code[bi])} volume={0.7} />
        </Sequence>
      ))}
      {pay && (
        <Sequence from={Math.round((revealStart + payAt) * fps)} layout="none">
          <Audio src={staticFile("sounds/ping.wav")} volume={0.8} />
        </Sequence>
      )}
    </>
  );
};
