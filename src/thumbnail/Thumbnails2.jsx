import React from "react";
import { AbsoluteFill, Img, staticFile, continueRender, delayRender } from "remotion";

// Psychology-driven thumbnail set (1280x720) for "Guess the Game Character".
//  P1 "95% FAIL"    loss aversion + staring face + pattern interrupt (yellow)  -> Sans
//  P2 "WHO AM I?"   curiosity gap + gaze (only the eyes are revealed)          -> Kirby
//  P3 "WHO'S THIS?" self-test + oversized crop + circle & arrow                -> Mega Man
// Max 3 words of main text each; one focal point; specific number; saturated colour.

const FONT = "'Big Shoulders Display','Arial Narrow',Impact,sans-serif";
const YELLOW = "#FFD21F", RED = "#FF2A2A", GOLD = "#FFC83D";

let fontHandle = null;
const useFont = () => {
  if (!fontHandle && typeof document !== "undefined") {
    fontHandle = delayRender("thumb-font");
    const f = new FontFace("Big Shoulders Display", `url(${staticFile("fonts/big-shoulders-display-latin-900-normal.woff2")})`, { weight: "900" });
    f.load().then((ff) => { document.fonts.add(ff); continueRender(fontHandle); }).catch(() => continueRender(fontHandle));
  }
};
const stroke = (px, c = "#0a0a14") => ({ WebkitTextStroke: `${px}px ${c}`, paintOrder: "stroke fill" });
const img = (f) => staticFile(`game/${f}`);
const grain = <AbsoluteFill style={{ backgroundImage: `url(${staticFile("fx/grain.png")})`, backgroundSize: "160px 160px", opacity: 0.1, mixBlendMode: "overlay" }} />;
const Tag = ({ children, bg = "#0a0a14", color = "#fff" }) => (
  <div style={{ position: "absolute", left: 50, bottom: 36, padding: "8px 22px 10px", background: bg, color, fontWeight: 900, fontSize: 38, letterSpacing: ".08em", lineHeight: 1, borderRadius: 8, boxShadow: "0 6px 0 rgba(0,0,0,.35)" }}>{children}</div>
);
const full = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" };

// ---------------------------------------------------------------- P1
export const ThumbP1 = ({ main = "sans.png" }) => {
  useFont();
  const cx = 1000;
  return (
    <AbsoluteFill style={{ background: YELLOW, fontFamily: FONT, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: `repeating-conic-gradient(from 0deg at ${cx}px 330px,#FFE14D 0deg 7deg,#FFB400 7deg 14deg)` }} />
      <AbsoluteFill style={{ background: `radial-gradient(620px 620px at ${cx}px 340px,rgba(255,255,255,.85),rgba(255,255,255,0) 70%)` }} />
      {/* staring face */}
      <div style={{ position: "absolute", left: cx - 500, top: -50, width: 1000, height: 1000 }}>
        <Img src={img(main)} style={{ ...full, filter: "drop-shadow(0 0 3px #0a0a14) drop-shadow(0 16px 0 rgba(0,0,0,.28))" }} />
      </div>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 62% 45%,rgba(0,0,0,0) 55%,rgba(60,30,0,.45) 100%)" }} />
      {grain}
      <div style={{ position: "absolute", left: 44, top: 70, transform: "rotate(-4deg)", transformOrigin: "0 0" }}>
        <div style={{ fontWeight: 900, fontSize: 340, lineHeight: .8, color: "#fff", letterSpacing: "-.01em", ...stroke(20), textShadow: "0 16px 0 rgba(0,0,0,.35)" }}>95%</div>
        <div style={{ display: "inline-block", marginTop: 30, padding: "4px 36px 12px", background: RED, color: "#fff", fontWeight: 900, fontSize: 210, lineHeight: .86, letterSpacing: ".03em", transform: "skewX(-8deg)", boxShadow: "0 14px 0 rgba(0,0,0,.4)", border: "8px solid #0a0a14" }}>FAIL</div>
      </div>
      <Tag>50 GAME CHARACTERS</Tag>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- P2
export const ThumbP2 = ({ main = "kirby.png" }) => {
  useFont();
  const cx = 850, B = 780, left = cx - B / 2, top = -30;
  const eye = (x) => ({ ...full, clipPath: `ellipse(4.0% 10.0% at ${x}% 35.7%)` });
  return (
    <AbsoluteFill style={{ background: "#2a0a5e", fontFamily: FONT, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: `radial-gradient(900px 760px at ${cx}px 360px,#ff3fa4 0%,#c2188f 28%,#5a1190 62%,#1b0640 100%)` }} />
      <AbsoluteFill style={{ background: `repeating-conic-gradient(from 4deg at ${cx}px 380px,rgba(255,255,255,.10) 0deg 6deg,rgba(255,255,255,0) 6deg 16deg)` }} />
      <div style={{ position: "absolute", left: cx - 330, top: 30, width: 660, height: 660, borderRadius: "50%", background: "radial-gradient(circle,#fff 0%,#ffe3f4 38%,rgba(255,200,235,0) 70%)" }} />
      <div style={{ position: "absolute", left, top, width: B, height: B }}>
        <Img src={img(main)} style={{ ...full, filter: "brightness(0) drop-shadow(0 0 3px #fff) drop-shadow(0 14px 22px rgba(0,0,0,.5))" }} />
        {/* only the eyes are revealed, with a glow */}
        <div style={{ position: "absolute", inset: 0, filter: "drop-shadow(0 0 14px #fff) drop-shadow(0 0 30px rgba(120,200,255,.9)) saturate(1.3) brightness(1.1)" }}>
          <Img src={img(main)} style={eye(42.5)} />
          <Img src={img(main)} style={eye(57.4)} />
        </div>
      </div>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 65% 48%,rgba(0,0,0,0) 55%,rgba(20,0,40,.6) 100%)" }} />
      {grain}
      <div style={{ position: "absolute", left: 44, top: 40 }}>
        <div style={{ fontWeight: 900, fontSize: 168, lineHeight: .86, color: "#fff", letterSpacing: ".01em", ...stroke(14), textShadow: "0 10px 0 rgba(0,0,0,.4)" }}>WHO<br />AM I?</div>
      </div>
      <Tag bg="#fff" color="#2a0a5e">50 SHADOWS</Tag>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- P3
export const ThumbP3 = ({ main = "mega-man.png" }) => {
  useFont();
  const B = 880, left = 480, top = -20;
  return (
    <AbsoluteFill style={{ background: "#0095ff", fontFamily: FONT, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: "radial-gradient(900px 800px at 880px 360px,#4be3ff 0%,#12b4ff 34%,#0071e0 70%,#003a8c 100%)" }} />
      <AbsoluteFill style={{ background: "repeating-conic-gradient(from 0deg at 880px 380px,rgba(255,255,255,.16) 0deg 6deg,rgba(255,255,255,0) 6deg 15deg)" }} />
      <div style={{ position: "absolute", left, top, width: B, height: B }}>
        <Img src={img(main)} style={{ ...full, filter: "brightness(0) drop-shadow(0 0 3px #fff) drop-shadow(0 0 3px #fff) drop-shadow(0 0 26px rgba(255,140,0,.95)) drop-shadow(0 16px 20px rgba(0,0,40,.5))" }} />
      </div>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 65% 48%,rgba(0,0,0,0) 55%,rgba(0,20,60,.6) 100%)" }} />
      {grain}
      {/* circle + arrow on the key spot */}
      <svg width="1280" height="720" style={{ position: "absolute", inset: 0 }}>
        <defs><filter id="sh"><feDropShadow dx="0" dy="5" stdDeviation="0" floodColor="#000" floodOpacity=".45" /></filter></defs>
        <g filter="url(#sh)">
          <ellipse cx="760" cy="168" rx="108" ry="92" transform="rotate(-8 760 168)" fill="none" stroke={RED} strokeWidth="16" />
          <path d="M500 360 C 580 360, 640 330, 690 262" fill="none" stroke={GOLD} strokeWidth="20" strokeLinecap="round" />
          <path d="M690 262 L 634 270 M690 262 L 686 322" fill="none" stroke={GOLD} strokeWidth="20" strokeLinecap="round" />
        </g>
      </svg>
      <div style={{ position: "absolute", left: 44, top: 30 }}>
        <div style={{ fontWeight: 900, fontSize: 218, lineHeight: .82, color: "#fff", letterSpacing: ".005em", ...stroke(11), textShadow: "0 12px 0 rgba(0,0,0,.4)" }}>WHO’S<br /><span style={{ color: GOLD }}>THIS?</span></div>
      </div>
      <Tag bg="#0a0a14">50 GAME CHARACTERS</Tag>
    </AbsoluteFill>
  );
};
