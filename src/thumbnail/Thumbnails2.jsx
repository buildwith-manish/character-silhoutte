import React from "react";
import { AbsoluteFill, Img, staticFile, continueRender, delayRender } from "remotion";

// Psychology-driven thumbnail set (1280x720) for "Guess the Game Character".
//  P1 "GAMERS ONLY?" colour/silhouette split + staring face (yellow)           -> Sans
//  P2 "WHO AM I?"   curiosity gap + gaze (only the eyes are revealed)          -> Kirby
//  P3 "NAME ALL 50?" self-test + glowing-eye clue + ring on the cannon (v2)    -> Mega Man
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

const OUT = "drop-shadow(0 0 3px #fff) drop-shadow(0 0 3px #fff)";
// Black silhouette with an outer glow plus a subtle inner sheen so it reads as a shape, not a flat blob.
const Sil = ({ src, glow = "rgba(255,140,0,.95)", sheen = "rgba(120,170,255,.38)" }) => (
  <>
    <Img src={src} style={{ ...full, filter: `brightness(0) ${OUT} drop-shadow(0 0 26px ${glow}) drop-shadow(0 16px 20px rgba(0,0,40,.5))` }} />
    <div style={{ position: "absolute", inset: 0, WebkitMaskImage: `url(${src})`, WebkitMaskSize: "100% 100%", WebkitMaskRepeat: "no-repeat", background: `linear-gradient(155deg, ${sheen} 0%, rgba(0,0,0,0) 48%)` }} />
  </>
);

// ---------------------------------------------------------------- P1
export const ThumbP1 = ({ main = "sans.png" }) => {
  useFont();
  const cx = 930, B = 780, left = cx - B / 2, top = -24;
  return (
    <AbsoluteFill style={{ background: YELLOW, fontFamily: FONT, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: `repeating-conic-gradient(from 0deg at ${cx}px 330px,#FFE14D 0deg 7deg,#FFB400 7deg 14deg)` }} />
      <AbsoluteFill style={{ background: `radial-gradient(640px 640px at ${cx}px 340px,rgba(255,255,255,.9),rgba(255,255,255,0) 70%)` }} />
      <div style={{ position: "absolute", left, top, width: B, height: B }}>
        {/* left half: real colours */}
        <Img src={img(main)} style={{ ...full, clipPath: "inset(0 50% 0 0)", filter: "drop-shadow(0 0 3px #0a0a14) drop-shadow(0 16px 0 rgba(0,0,0,.28))" }} />
        {/* right half: silhouette */}
        <div style={{ position: "absolute", inset: 0, clipPath: "inset(0 0 0 50%)" }}>
          <Sil src={img(main)} glow="rgba(255,255,255,.9)" sheen="rgba(255,255,255,.28)" />
        </div>
        {/* seam */}
        <div style={{ position: "absolute", left: "50%", top: "5%", bottom: "3%", width: 7, marginLeft: -3, background: "#fff", borderRadius: 4, boxShadow: "0 0 18px 7px rgba(255,255,255,.95), 0 0 2px 2px #0a0a14" }} />
      </div>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 70% 45%,rgba(0,0,0,0) 55%,rgba(60,30,0,.45) 100%)" }} />
      {grain}
      <div style={{ position: "absolute", left: 44, top: 58, transform: "rotate(-4deg)", transformOrigin: "0 0" }}>
        <div style={{ fontWeight: 900, fontSize: 218, lineHeight: .8, color: "#fff", letterSpacing: "-.005em", ...stroke(14), textShadow: "0 14px 0 rgba(0,0,0,.35)" }}>GAMERS</div>
        <div style={{ display: "inline-block", marginTop: 34, padding: "4px 40px 12px", background: RED, color: "#fff", fontWeight: 900, fontSize: 200, lineHeight: .86, letterSpacing: ".03em", transform: "skewX(-8deg)", boxShadow: "0 14px 0 rgba(0,0,0,.4)", border: "8px solid #0a0a14" }}>ONLY?</div>
      </div>
      <Tag>50 SILHOUETTES</Tag>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- P2
export const ThumbP2 = ({ main = "kirby.png" }) => {
  useFont();
  const cx = 900, B = 830, left = cx - B / 2, top = -77;
  const eye = (x) => ({ ...full, clipPath: `ellipse(4.0% 10.0% at ${x}% 35.7%)` });
  return (
    <AbsoluteFill style={{ background: "#2a0a5e", fontFamily: FONT, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: `radial-gradient(900px 760px at ${cx}px 360px,#ff3fa4 0%,#c2188f 28%,#5a1190 62%,#1b0640 100%)` }} />
      <AbsoluteFill style={{ background: `repeating-conic-gradient(from 4deg at ${cx}px 380px,rgba(255,255,255,.12) 0deg 6deg,rgba(255,255,255,0) 6deg 16deg)` }} />
      <div style={{ position: "absolute", left: cx - 380, top: 20, width: 760, height: 700, borderRadius: "50%", background: "radial-gradient(circle,#fff 0%,#ffe3f4 38%,rgba(255,200,235,0) 70%)" }} />
      <div style={{ position: "absolute", left, top, width: B, height: B }}>
        <Sil src={img(main)} glow="rgba(255,255,255,.95)" sheen="rgba(255,120,200,.34)" />
        {/* only the eyes are revealed, with a glow */}
        <div style={{ position: "absolute", inset: 0, filter: "drop-shadow(0 0 14px #fff) drop-shadow(0 0 30px rgba(120,200,255,.9)) saturate(1.3) brightness(1.1)" }}>
          <Img src={img(main)} style={eye(42.5)} />
          <Img src={img(main)} style={eye(57.4)} />
        </div>
      </div>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 70% 48%,rgba(0,0,0,0) 55%,rgba(20,0,40,.6) 100%)" }} />
      {grain}
      <div style={{ position: "absolute", left: 44, top: 50 }}>
        <div style={{ fontWeight: 900, fontSize: 196, lineHeight: .84, color: "#fff", letterSpacing: ".01em", ...stroke(13), textShadow: "0 10px 0 rgba(0,0,0,.4)" }}>WHO<br /><span style={{ color: GOLD }}>AM I?</span></div>
      </div>
      <Tag bg="#fff" color="#2a0a5e">50 SILHOUETTES</Tag>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- P3
// v3: whole character, ring only, glowing-eye clue, higher-stakes text, inner sheen on the silhouette.
export const ThumbP3 = ({ main = "mega-man.png" }) => {
  useFont();
  const B = 790, left = 585, top = -36;
  const eye = (x) => ({ ...full, clipPath: `ellipse(2.5% 3.1% at ${x}% 25.6%)` });
  return (
    <AbsoluteFill style={{ background: "#0095ff", fontFamily: FONT, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: "radial-gradient(900px 800px at 960px 360px,#4be3ff 0%,#12b4ff 34%,#0071e0 70%,#003a8c 100%)" }} />
      <AbsoluteFill style={{ background: "repeating-conic-gradient(from 0deg at 960px 380px,rgba(255,255,255,.16) 0deg 6deg,rgba(255,255,255,0) 6deg 15deg)" }} />
      <div style={{ position: "absolute", left, top, width: B, height: B }}>
        <Sil src={img(main)} />
        <div style={{ position: "absolute", inset: 0, filter: "drop-shadow(0 0 10px #fff) drop-shadow(0 0 24px rgba(120,230,255,.95)) saturate(1.3) brightness(1.15)" }}>
          <Img src={img(main)} style={eye(46.9)} />
          <Img src={img(main)} style={eye(54.8)} />
        </div>
      </div>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 70% 48%,rgba(0,0,0,0) 55%,rgba(0,20,60,.6) 100%)" }} />
      {grain}
      <svg width="1280" height="720" style={{ position: "absolute", inset: 0 }}>
        <defs><filter id="sh"><feDropShadow dx="0" dy="5" stdDeviation="0" floodColor="#000" floodOpacity=".45" /></filter></defs>
        <g filter="url(#sh)">
          <ellipse cx="822" cy="98" rx="82" ry="72" transform="rotate(-8 822 98)" fill="none" stroke={RED} strokeWidth="14" />
        </g>
      </svg>
      <div style={{ position: "absolute", left: 44, top: 60 }}>
        <div style={{ fontWeight: 900, fontSize: 185, lineHeight: .82, color: "#fff", letterSpacing: ".005em", ...stroke(10), textShadow: "0 10px 0 rgba(0,0,0,.4)" }}>NAME<br /><span style={{ color: GOLD }}>ALL 50?</span></div>
      </div>
      <Tag bg="#0a0a14">50 SILHOUETTES</Tag>
    </AbsoluteFill>
  );
};
