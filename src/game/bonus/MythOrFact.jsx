import React from "react";
import { interpolate, spring } from "remotion";

const GREEN = "#3DDC97";
const RED = "#FF4D5E";

const Check = ({ color, size = 90 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100"><path d="M18 54 L40 76 L84 26" fill="none" stroke={color} strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const Cross = ({ color, size = 90 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100"><path d="M22 22 L78 78 M78 22 L22 78" fill="none" stroke={color} strokeWidth="16" strokeLinecap="round" /></svg>
);

// MYTH OR FACT: a statement types in word by word (so there is something to read while the clock starts), then FACT / MYTH buttons
// slide up. A hint shows with 3 s left. On the reveal the buttons leave and a big FACT! / MYTH! stamp slams onto the statement card.
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

  const Btn = ({ k, label, color, icon }) => {
    const p = btnPop(k);
    return (
      <div style={{ position: "absolute", left: k === 0 ? 2560 / 2 - 80 - 760 : 2560 / 2 + 80, top: 815, width: 760, height: 170, borderRadius: 34, border: `7px solid ${color}`, background: "rgba(4,14,20,.82)", display: "flex", alignItems: "center", justifyContent: "center", gap: 26, boxShadow: `0 0 50px ${color}66`, opacity: Math.min(1, p * 1.3) * btnOut, transform: `translateY(${(1 - p) * 50}px)` }}>
        {icon}
        <span style={{ fontFamily: "'Big Shoulders Display',Impact,sans-serif", fontWeight: 900, fontSize: 130, lineHeight: 1, letterSpacing: ".05em", color }}>{label}</span>
      </div>
    );
  };

  return (
    <>
      <div style={{ position: "absolute", left: (2560 - CARD_W) / 2, top: 320, width: CARD_W, minHeight: 400, padding: "56px 80px", boxSizing: "border-box", borderRadius: 56, border: `8px solid ${reveal ? vColor : item.accent}`, background: "rgba(4,14,20,.8)", boxShadow: `0 0 ${reveal ? 100 : 60}px ${reveal ? `${vColor}88` : `${item.accent}55`}`, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", transform: `scale(${(0.7 + 0.3 * cardPop).toFixed(4)})`, opacity: Math.min(1, cardPop * 1.4) }}>
        <span style={{ position: "absolute", left: 34, top: -10, fontFamily: "'Big Shoulders Display',Impact,sans-serif", fontWeight: 900, fontSize: 260, lineHeight: 1, color: item.accent, opacity: 0.55 }}>{"“"}</span>
        <div style={{ fontFamily: "'Manrope','Segoe UI',sans-serif", fontWeight: 800, fontSize: 98, lineHeight: 1.18, color: "#fff", textShadow: "0 4px 20px rgba(0,0,0,.6)" }}>
          {words.map((w, i) => {
            const o = interpolate(tq, [wordStart + i * wordStep, wordStart + i * wordStep + 0.18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return <span key={i} style={{ opacity: reveal ? 1 : o }}>{w}{" "}</span>;
          })}
        </div>
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
    </>
  );
};
