import React from "react";
import { Img, spring, staticFile } from "remotion";

const TILE = 470;
const GAP = 120;

// EMOJI DECODER: three picture tiles (item.tiles = image paths under public/) + "= ?". Tiles pop in one by one so the viewer reads them in order; the "?" tile pulses
// while the clock runs, a hint chip appears with 3 s left, and on the reveal the "?" turns into a green check.
export const EmojiDecoder = ({ item, phase, tq, tr, fps, left }) => {
  const tiles = item.tiles;
  const n = tiles.length;
  const totalW = (n + 1) * TILE + n * GAP;
  const x0 = (2560 - totalW) / 2;
  const popOf = (at) => spring({ frame: Math.max(0, Math.round((tq - at) * fps)), fps, config: { damping: 11, stiffness: 190 } });
  const reveal = phase === "reveal";
  const qPulse = 1 + 0.04 * Math.sin(tq * Math.PI * 2 * 1.2);
  const checkPop = reveal ? spring({ frame: Math.round(tr * fps), fps, config: { damping: 9, stiffness: 220 } }) : 0;
  const hintOn = !reveal && left <= 3;
  const hintIn = hintOn ? spring({ frame: Math.round((3 - left) * fps), fps, config: { damping: 12, stiffness: 200 } }) : 0;

  const Tile = ({ i, children, border, glow, bg, scale = 1 }) => (
    <div style={{ position: "absolute", left: x0 + i * (TILE + GAP), top: 400, width: TILE, height: TILE, borderRadius: 56, border: `8px solid ${border}`, background: bg, boxShadow: `0 0 70px ${glow}, inset 0 0 60px rgba(255,255,255,.06)`, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${scale.toFixed(4)})` }}>
      {children}
    </div>
  );

  return (
    <>
      {tiles.map((e, i) => {
        const p = popOf(0.25 + i * 0.5);
        return (
          <React.Fragment key={i}>
            <Tile i={i} border={item.accent} glow={`${item.accent}66`} bg="rgba(4,14,20,.72)" scale={0.4 + 0.6 * p}>
              <Img src={staticFile(e)} style={{ width: TILE - 80, height: TILE - 80, objectFit: "contain", opacity: p, filter: "drop-shadow(0 10px 18px rgba(0,0,0,.45))" }} />
            </Tile>
            <div style={{ position: "absolute", left: x0 + i * (TILE + GAP) + TILE, top: 400, width: GAP, height: TILE, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Big Shoulders Display',Impact,sans-serif", fontWeight: 900, fontSize: 130, color: "#fff", opacity: popOf(0.25 + i * 0.5 + 0.2) }}>
              {i < n - 1 ? "+" : "="}
            </div>
          </React.Fragment>
        );
      })}
      <Tile i={n} border={reveal ? "#3DDC97" : "#FFD23F"} glow={reveal ? "#3DDC9788" : "#FFD23F77"} bg="rgba(4,14,20,.72)" scale={reveal ? 0.85 + 0.15 * checkPop : popOf(0.25 + n * 0.5) * qPulse}>
        <span style={{ fontFamily: "'Big Shoulders Display',Impact,sans-serif", fontWeight: 900, fontSize: 340, lineHeight: 1, color: reveal ? "#3DDC97" : "#FFD23F", textShadow: `0 0 50px ${reveal ? "#3DDC97" : "#FFD23F"}99` }}>
          {reveal ? "✓" : "?"}
        </span>
      </Tile>

      {hintOn && (
        <div style={{ position: "absolute", left: 0, width: "100%", top: 950, textAlign: "center", opacity: hintIn, transform: `translateY(${(1 - hintIn) * 30}px)` }}>
          <span style={{ display: "inline-block", padding: "14px 46px", borderRadius: 999, background: "rgba(0,0,0,.6)", border: "3px solid #FFD23F", fontFamily: "'Manrope','Segoe UI',sans-serif", fontWeight: 800, fontSize: 54, color: "#fff" }}>
            <span style={{ color: "#FFD23F" }}>HINT:</span> {item.hint}
          </span>
        </div>
      )}
    </>
  );
};
