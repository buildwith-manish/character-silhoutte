import React from "react";
import { Audio, Sequence, interpolate, spring, staticFile } from "remotion";
import { G } from "../config";

const GREEN = "#3DDC97";
const RED = "#FF4D5E";
const GOLD = "#FFD23F";
const EMOJI_FONT = "'Noto Color Emoji','Apple Color Emoji','Segoe UI Emoji',sans-serif";

// deterministic pseudo-random (Remotion frames must render identically every time)
const rand = (i, s) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
const clean = (w) => w.toLowerCase().replace(/[^a-z0-9']/g, "");

const Check = ({ color, size = 90 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100"><path d="M18 54 L40 76 L84 26" fill="none" stroke={color} strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const Cross = ({ color, size = 90 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100"><path d="M22 22 L78 78 M78 22 L22 78" fill="none" stroke={color} strokeWidth="16" strokeLinecap="round" /></svg>
);

// Green confetti burst for a FACT.
const Confetti = ({ t }) => {
  const COLORS = [GREEN, GOLD, "#fff", "#7CFF4F", "#38E1FF"];
  return (
    <>
      {Array.from({ length: 56 }).map((_, i) => {
        const a = -Math.PI / 2 + (rand(i, 1) - 0.5) * Math.PI * 1.5;
        const sp = 900 + rand(i, 2) * 1500;
        const x = 1280 + Math.cos(a) * sp * t;
        const y = 800 + Math.sin(a) * sp * t + 0.5 * 2600 * t * t;
        const size = 16 + rand(i, 3) * 20;
        const fade = interpolate(t, [1.8, 2.8], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return <div key={i} style={{ position: "absolute", left: x, top: y, width: size, height: size * 0.55, background: COLORS[i % COLORS.length], opacity: fade, transform: `rotate(${(rand(i, 4) * 360 + t * (300 + rand(i, 5) * 500)).toFixed(1)}deg)` }} />;
      })}
    </>
  );
};

// Cracked-glass lines drawn across the statement card for a MYTH.
const Crack = ({ p }) => {
  const lines = [
    "M1010 0 L960 90 L1040 160 L930 250 L990 330 L940 400",
    "M960 90 L820 130 L700 110",
    "M1040 160 L1190 130 L1330 190",
    "M930 250 L780 290 L640 270",
    "M990 330 L1120 360 L1260 340",
  ];
  return (
    <svg width="100%" height="100%" viewBox="0 0 2000 400" preserveAspectRatio="none" style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}>
      {lines.map((d, i) => {
        const q = Math.min(1, Math.max(0, p * 1.6 - i * 0.18));
        return <path key={i} d={d} pathLength="1" strokeDasharray="1" strokeDashoffset={1 - q} fill="none" stroke="#fff" strokeOpacity=".85" strokeWidth={i === 0 ? 7 : 4} strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 10px ${RED})` }} />;
      })}
    </svg>
  );
};

// MYTH OR FACT: a statement types in word by word (key phrase glows in the accent colour), then FACT / MYTH buttons slide up.
// A hint shows with 3 s left and the last 3 s build tension (buttons pulse in turn, card trembles). The reveal differs by answer:
// FACT = green flash + confetti + bright ping, MYTH = red flash + screen shake + cracked card + heavy hit.
export const MythOrFact = ({ item, phase, tq, tr, fps, left }) => {
  const reveal = phase === "reveal";
  const words = item.statement.split(" ");
  const wordStart = 0.4;
  const wordStep = 0.11;
  const cardPop = spring({ frame: Math.max(0, Math.round(tq * fps)), fps, config: { damping: 12, stiffness: 170 } });
  const btnAt = wordStart + words.length * wordStep + 0.2;
  const btnPop = (k) => spring({ frame: Math.max(0, Math.round((tq - btnAt - k * 0.2) * fps)), fps, config: { damping: 12, stiffness: 200 } });
  const btnOut = reveal ? interpolate(tr, [0, 0.3], [1, 0], { extrapolateRight: "clamp" }) : 1;
  const stampT = reveal ? Math.max(0, tr - 0.08) : 0;
  const stamp = reveal ? spring({ frame: Math.round(stampT * fps), fps, config: { damping: 8, stiffness: 240 } }) : 0;
  const hintOn = !reveal && item.hint && left <= 3;
  const hintIn = hintOn ? spring({ frame: Math.round((3 - left) * fps), fps, config: { damping: 12, stiffness: 200 } }) : 0;
  const verdict = item.truth ? "FACT!" : "MYTH!";
  const vColor = item.truth ? GREEN : RED;
  const CARD_W = 2000;

  // key phrase (item.highlight) glows in the accent colour
  const hlWords = (item.highlight || "").split(" ").map(clean).filter(Boolean);
  const hlIdx = new Set();
  if (hlWords.length) {
    for (let i = 0; i + hlWords.length <= words.length; i++) {
      if (hlWords.every((h, j) => clean(words[i + j]) === h)) for (let j = 0; j < hlWords.length; j++) hlIdx.add(i + j);
    }
  }

  // tension in the last 3 s
  const tense = !reveal ? interpolate(left, [3, 0], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  const trembleX = Math.sin(tq * 95) * 4 * tense;
  const trembleY = Math.cos(tq * 83) * 2.5 * tense;

  // reveal effects
  const shakeAmp = reveal && !item.truth ? Math.exp(-tr * 5) * 34 : 0;
  const shakeX = Math.sin(tr * 70) * shakeAmp;
  const shakeY = Math.cos(tr * 53) * shakeAmp * 0.6;
  const tint = reveal ? interpolate(tr, [0, 0.45], [0.4, 0], { extrapolateRight: "clamp" }) : 0;
  const crack = reveal && !item.truth ? Math.min(1, Math.max(0, (tr - 0.05) / 0.35)) : 0;

  // hero emoji badge: 🎮 while thinking, ✅ / ❌ on the reveal
  const badgePop = spring({ frame: Math.max(0, Math.round((tq - 0.2) * fps)), fps, config: { damping: 9, stiffness: 190 } });
  const badgeVerdict = reveal ? spring({ frame: Math.round(Math.max(0, tr - 0.05) * fps), fps, config: { damping: 7, stiffness: 230 } }) : 0;
  const bob = Math.sin(tq * Math.PI * 1.6) * 10;
  const badgeEmoji = reveal ? (item.truth ? "✅" : "❌") : (item.emoji || "🎮");
  const badgeColor = reveal ? vColor : item.accent;

  const Btn = ({ k, label, color, icon }) => {
    const p = btnPop(k);
    const alt = 0.5 + 0.5 * Math.sin(tq * Math.PI * 2 * 2 + k * Math.PI);
    const pulse = 1 + 0.06 * tense * alt;
    const glow = 50 + 70 * tense * alt;
    return (
      <div style={{ position: "absolute", left: k === 0 ? 2560 / 2 - 80 - 760 : 2560 / 2 + 80, top: 815, width: 760, height: 170, borderRadius: 34, border: `7px solid ${color}`, background: `linear-gradient(180deg, rgba(255,255,255,.07), rgba(4,14,20,.86) 45%)`, display: "flex", alignItems: "center", justifyContent: "center", gap: 26, boxShadow: `0 0 ${glow}px ${color}88, inset 0 4px 0 rgba(255,255,255,.14)`, opacity: Math.min(1, p * 1.3) * btnOut, transform: `translateY(${(1 - p) * 50}px) scale(${pulse.toFixed(4)})` }}>
        {icon}
        <span style={{ fontFamily: "'Big Shoulders Display',Impact,sans-serif", fontWeight: 900, fontSize: 130, lineHeight: 1, letterSpacing: ".05em", color }}>{label}</span>
      </div>
    );
  };

  const revealAt = G.bonus.introSeconds + item.seconds;

  return (
    <>
      <div style={{ position: "absolute", inset: 0, transform: `translate(${(shakeX + trembleX).toFixed(2)}px, ${(shakeY + trembleY).toFixed(2)}px)` }}>
        <div style={{ position: "absolute", left: (2560 - CARD_W) / 2, top: 320, width: CARD_W, minHeight: 400, padding: "56px 80px", boxSizing: "border-box", borderRadius: 56, border: `8px solid ${reveal ? vColor : item.accent}`, background: "linear-gradient(180deg, rgba(255,255,255,.08) 0%, rgba(4,14,20,.82) 30%, rgba(4,14,20,.86) 100%)", boxShadow: `0 0 ${reveal ? 100 : 60}px ${reveal ? `${vColor}88` : `${item.accent}55`}, 0 30px 60px rgba(0,0,0,.45), inset 0 4px 0 rgba(255,255,255,.14)`, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", transform: `scale(${(0.7 + 0.3 * cardPop).toFixed(4)})`, opacity: Math.min(1, cardPop * 1.4) }}>
          <span style={{ position: "absolute", left: 34, top: -10, fontFamily: "'Big Shoulders Display',Impact,sans-serif", fontWeight: 900, fontSize: 260, lineHeight: 1, color: item.accent, opacity: 0.55 }}>{"“"}</span>
          <div style={{ fontFamily: "'Manrope','Segoe UI',sans-serif", fontWeight: 800, fontSize: 98, lineHeight: 1.18, color: "#fff", textShadow: "0 4px 20px rgba(0,0,0,.6)" }}>
            {words.map((w, i) => {
              const o = interpolate(tq, [wordStart + i * wordStep, wordStart + i * wordStep + 0.18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              const hl = hlIdx.has(i);
              return <span key={i} style={{ opacity: reveal ? 1 : o, ...(hl ? { color: item.accent, textShadow: `0 0 34px ${item.accent}aa, 0 4px 20px rgba(0,0,0,.6)` } : null) }}>{w}{" "}</span>;
            })}
          </div>
          {crack > 0 && <Crack p={crack} />}
        </div>

        {/* hero emoji badge on the card's top-right corner */}
        <div style={{ position: "absolute", left: 2170, top: 235, width: 200, height: 200, borderRadius: 100, border: `8px solid ${badgeColor}`, background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,.22), rgba(4,14,20,.92) 60%)", boxShadow: `0 0 60px ${badgeColor}88`, display: "flex", alignItems: "center", justifyContent: "center", opacity: Math.min(1, badgePop * 1.4), transform: `translateY(${reveal ? 0 : bob}px) scale(${((0.4 + 0.6 * badgePop) * (reveal ? 0.85 + 0.15 * badgeVerdict : 1)).toFixed(4)}) rotate(${reveal ? 0 : Math.sin(tq * 2) * 6}deg)` }}>
          <span style={{ fontFamily: EMOJI_FONT, fontSize: 112, lineHeight: 1 }}>{badgeEmoji}</span>
        </div>

        {/* verdict stamp sits BELOW the statement card so the statement stays readable on the reveal */}
        {reveal && (
          <div style={{ position: "absolute", left: 0, width: "100%", top: 735, textAlign: "center" }}>
            <span style={{ display: "inline-block", padding: "0 70px", borderRadius: 24, border: `12px solid ${vColor}`, background: "rgba(4,14,20,.92)", color: vColor, fontFamily: "'Big Shoulders Display',Impact,sans-serif", fontWeight: 900, fontSize: 150, lineHeight: 1.1, letterSpacing: ".05em", transform: `rotate(-4deg) scale(${(0.3 + 0.7 * stamp).toFixed(4)})`, opacity: Math.min(1, stamp * 2), boxShadow: `0 0 80px ${vColor}aa` }}>{verdict}</span>
          </div>
        )}

        {btnOut > 0.01 && (
          <>
            <Btn k={0} label="FACT" color={GREEN} icon={<Check color={GREEN} />} />
            <Btn k={1} label="MYTH" color={RED} icon={<Cross color={RED} />} />
          </>
        )}

        {hintOn && (
          <div style={{ position: "absolute", left: 0, width: "100%", top: 1050, textAlign: "center", opacity: hintIn, transform: `translateY(${(1 - hintIn) * 30}px)` }}>
            <span style={{ display: "inline-block", padding: "12px 44px", borderRadius: 999, background: "rgba(0,0,0,.6)", border: "3px solid #FFD23F", fontFamily: "'Manrope','Segoe UI',sans-serif", fontWeight: 800, fontSize: 50, color: "#fff" }}>
              <span style={{ color: "#FFD23F" }}>HINT:</span> {item.hint}
            </span>
          </div>
        )}
      </div>

      {reveal && item.truth && <Confetti t={Math.max(0, tr - 0.05)} />}
      {tint > 0.001 && <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: `radial-gradient(circle at 50% 45%, ${vColor}00 0%, ${vColor} 140%)`, opacity: tint }} />}

      {/* reveal sound: bright ping for FACT, heavy hit for MYTH */}
      <Sequence from={Math.round(revealAt * fps)} layout="none">
        {item.truth ? <Audio src={staticFile("sounds/ping.wav")} volume={0.8} /> : <Audio src={staticFile("sounds/impact.wav")} volume={0.8} />}
      </Sequence>
    </>
  );
};
