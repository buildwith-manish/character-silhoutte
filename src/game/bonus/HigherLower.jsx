import React from "react";
import { Img, spring, staticFile } from "remotion";

const CARD_W = 1000;
const CARD_H = 650;
const CARD_TOP = 300;
const LEFT_X = 130;
const RIGHT_X = 2560 - 130 - CARD_W;

// HIGHER OR LOWER (duel): two game cards labelled A and B, years hidden. Cards pop in one by one, a "VS" badge sits between them,
// a hint chip appears with 3 s left, and on the reveal the years flip in, the winner glows green with a FIRST ribbon and the loser dims.
export const HigherLower = ({ item, phase, tq, tr, fps, left }) => {
  const reveal = phase === "reveal";
  const popOf = (at) => spring({ frame: Math.max(0, Math.round((tq - at) * fps)), fps, config: { damping: 11, stiffness: 180 } });
  const yearPop = reveal ? spring({ frame: Math.max(0, Math.round(tr * fps)), fps, config: { damping: 9, stiffness: 210 } }) : 0;
  const hintOn = !reveal && item.hint && left <= 3;
  const hintIn = hintOn ? spring({ frame: Math.round((3 - left) * fps), fps, config: { damping: 12, stiffness: 200 } }) : 0;
  const qPulse = 1 + 0.05 * Math.sin(tq * Math.PI * 2 * 1.2);

  const Card = ({ c, i, x, at }) => {
    const p = popOf(at);
    const won = reveal && item.winner === i;
    const lost = reveal && item.winner !== i;
    const border = won ? "#3DDC97" : item.accent;
    return (
      <div style={{ position: "absolute", left: x, top: CARD_TOP, width: CARD_W, height: CARD_H, borderRadius: 56, border: `8px solid ${border}`, background: "rgba(4,14,20,.78)", boxShadow: `0 0 ${won ? 110 : 60}px ${won ? "#3DDC97aa" : `${item.accent}55`}, inset 0 0 70px rgba(255,255,255,.05)`, transform: `scale(${(0.5 + 0.5 * p).toFixed(4)}) translateY(${lost ? 14 : 0}px)`, opacity: lost ? 0.5 : Math.min(1, p * 1.4), textAlign: "center" }}>
        {/* A / B tag */}
        <div style={{ position: "absolute", left: 34, top: 28, width: 110, height: 110, borderRadius: "50%", background: border, color: "#04121a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Big Shoulders Display',Impact,sans-serif", fontWeight: 900, fontSize: 92, lineHeight: 1 }}>{c.tag}</div>
        {/* FIRST ribbon */}
        {won && (
          <div style={{ position: "absolute", right: 30, top: 34, padding: "8px 30px", borderRadius: 12, background: "#3DDC97", color: "#04121a", fontFamily: "'Big Shoulders Display',Impact,sans-serif", fontWeight: 900, fontSize: 64, letterSpacing: ".08em", transform: `scale(${(0.7 + 0.3 * yearPop).toFixed(3)})` }}>FIRST!</div>
        )}
        {c.image && <Img src={staticFile(c.image)} style={{ position: "absolute", left: "50%", top: 14, width: 300, height: 300, marginLeft: -150, objectFit: "contain", filter: "drop-shadow(0 10px 18px rgba(0,0,0,.5))" }} />}
        <div style={{ paddingTop: c.image ? 300 : 150, fontFamily: "'Big Shoulders Display',Impact,sans-serif", fontWeight: 900, fontSize: c.image ? 140 : 170, lineHeight: 1, textTransform: "uppercase", textShadow: "0 6px 30px rgba(0,0,0,.6)" }}>{c.title}</div>
        <div style={{ marginTop: 4, fontWeight: 800, fontSize: 42, letterSpacing: ".1em", textTransform: "uppercase", color: item.accent }}>{c.line}</div>
        <div style={{ marginTop: c.image ? 22 : 40, fontFamily: "'JetBrains Mono','Menlo',monospace", fontWeight: 800, fontSize: c.image ? 104 : 120, lineHeight: 1, color: reveal ? (won ? "#3DDC97" : "#fff") : "#FFD23F", transform: `scale(${reveal ? 0.8 + 0.2 * yearPop : 1})`, textShadow: reveal ? "none" : "0 0 40px #FFD23F88" }}>
          {reveal ? c.year : "????"}
        </div>
      </div>
    );
  };

  return (
    <>
      <Card c={item.cards[0]} i={0} x={LEFT_X} at={0.2} />
      <Card c={item.cards[1]} i={1} x={RIGHT_X} at={0.8} />
      {/* VS badge */}
      <div style={{ position: "absolute", left: 1280 - 110, top: CARD_TOP + CARD_H / 2 - 110, width: 220, height: 220, borderRadius: "50%", background: "#FFD23F", color: "#04121a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Big Shoulders Display',Impact,sans-serif", fontWeight: 900, fontSize: 130, boxShadow: "0 0 60px #FFD23Faa", transform: `scale(${(popOf(0.55) * (reveal ? 1 : qPulse)).toFixed(4)})`, opacity: reveal ? 0.0 : 1 }}>VS</div>

      {hintOn && (
        <div style={{ position: "absolute", left: 0, width: "100%", top: 1000, textAlign: "center", opacity: hintIn, transform: `translateY(${(1 - hintIn) * 30}px)` }}>
          <span style={{ display: "inline-block", padding: "14px 46px", borderRadius: 999, background: "rgba(0,0,0,.6)", border: "3px solid #FFD23F", fontFamily: "'Manrope','Segoe UI',sans-serif", fontWeight: 800, fontSize: 54, color: "#fff" }}>
            <span style={{ color: "#FFD23F" }}>HINT:</span> {item.hint}
          </span>
        </div>
      )}
    </>
  );
};
