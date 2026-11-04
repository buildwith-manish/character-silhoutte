// Long-video structure cards: Intro (rules in ~6 s), Recap / score check (mid-video), Outro (the one "How many did you get?" ask).
// Same look as the quiz clips (brand background, fonts, type scale, grain); all text + timing in settings.json -> structure.
import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import settings from "../settings.json";
import rounds from "./rounds.json";
import { prog as pr, lerp, power2InOut as eio, expoOut as ex } from "./gsap-helpers";
import { buildCss } from "./style";
import { Motif } from "./Motif";
import { BgMotes } from "./Depth";
import { fillTemplate, useFonts, usePreloadImage } from "./util";

const FPS = settings.fps;
const ST = settings.structure || {};
const { colors } = settings;
const TY = settings.type || { xl: 128, l: 72, m: 44, s: 28 };
const BG = ["#2A1670", "#120A3A", "#05020F"]; // brand violet, the same family as the bonus look but calmer

// ---- counts the cards talk about (taken from the real series, so they are always right) ----
const normalCount = rounds.filter((r) => !r.type || r.type === "normal").length;
const bonusCount = rounds.length - normalCount;
const scoreTotal = rounds.length; // every clip (questions + bonus rounds) is worth +1 on screen

export const cardSeconds = (k, fallback) => Math.max(1, (ST[k] && ST[k].seconds) || fallback);
export const cardFrames = (k, fallback) => Math.round(cardSeconds(k, fallback) * FPS);

// score ranges for the outro tiers: 90% / 60% / 30% of the total
export function tiersFor(total, names) {
  const a = Math.ceil(0.9 * total), b = Math.ceil(0.6 * total), c = Math.ceil(0.3 * total);
  const rg = (lo, hi) => (lo >= hi ? `${hi}` : `${lo}–${hi}`);
  return [
    { range: rg(a, total), name: names[0] },
    { range: rg(b, a - 1), name: names[1] },
    { range: rg(c, b - 1), name: names[2] },
    { range: rg(0, c - 1), name: names[3] },
  ];
}

const spring = (p) => (p <= 0 ? 0 : p >= 1 ? 1 : 1 - Math.exp(-7 * p) * Math.cos(15 * p));

// One word per slot, sliding up out of a mask (same move as the question prompt)
const Words = ({ text, t, t0, step = 0.1, dur = 0.5, out = 0, style }) => (
  <div style={{ display: "flex", justifyContent: "center", gap: "0.28em", whiteSpace: "nowrap", ...style }}>
    {String(text).split(/\s+/).map((w, i) => {
      const e = ex(pr(t, t0 + i * step, t0 + i * step + dur));
      return (
        <span key={i} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top", padding: "0 .04em" }}>
          <span style={{ display: "inline-block", transform: `translateY(${((1 - e) * 115 - out * 115).toFixed(1)}%)` }}>{w}</span>
        </span>
      );
    })}
  </div>
);

// Shared scene: brand stage + optional wipe in / out + optional fade to black
const Frame = ({ children, t, dur, wipeIn, wipeOut, fadeOut, litFrom = 0 }) => {
  const hi = 0.55 + 0.45 * ex(pr(t, litFrom, litFrom + 0.9));
  const panelX = (k) => {
    if (wipeIn && t < 0.5) return -600 + eio(pr(t, k * 0.05, k * 0.05 + 0.38)) * 2400;
    if (wipeOut && t > dur - 0.5) return -2600 + eio(pr(t, dur - 0.5 + k * 0.05, dur - 0.12 + k * 0.05)) * 2000;
    return -2600;
  };
  return (
    <>
      <div className="ly" style={{ left: 0, top: 0 }}>
        <div className="bg" style={{ background: `radial-gradient(1100px 800px at 50% 40%, ${BG[0]} 0%, ${BG[1]} 50%, ${BG[2]} 100%)` }} />
        <Motif kind="speed" t={t} color={colors.series} opacity={0.1} vis={hi} />
        <BgMotes t={t} vis={hi} />
        <div className="cone" style={{ opacity: 0.55 * hi, transform: `rotate(${(Math.sin(t * 0.5) * 1.4).toFixed(2)}deg)` }} />
      </div>
      {children}
      <div className="vig" />
      <div className="grain" style={{ backgroundImage: `url(${staticFile("fx/grain.png")})`, backgroundSize: "160px 160px" }} />
      {fadeOut ? <div style={{ inset: 0, background: BG[2], opacity: pr(t, dur - 0.6, dur) }} /> : null}
      <div className="pn" style={{ background: colors.series, transform: `translateX(${panelX(0).toFixed(1)}px) skewX(-12deg)` }} />
      <div className="pn" style={{ background: colors.navy2, transform: `translateX(${panelX(1).toFixed(1)}px) skewX(-12deg)` }} />
    </>
  );
};

const Shell = ({ id, dur, soundFile, build }) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const fontsReady = useFonts();
  usePreloadImage(staticFile("fx/grain.png"));
  const t = frame / FPS;
  return (
    <AbsoluteFill style={{ background: "#070b1e" }}>
      <Audio src={staticFile(`sounds/cards/${soundFile}.wav`)} volume={settings.mix.volume} />
      <style>{buildCss(colors, colors.series, TY)}</style>
      <div id="stage" style={{ transform: `scale(${width / 1600})`, opacity: fontsReady ? 1 : 0 }}>
        {build(t, dur)}
      </div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------------------------------------------------------------
// INTRO: title, three rules, "READY?" (no wipe-in: it is the first thing the viewer sees; wipes out into question 1)
// ------------------------------------------------------------------------------------------------------------------------
export const Intro = () => {
  const I = ST.intro || {};
  const dur = cardSeconds("intro", 6);
  const rules = (I.rules || ["Spot the silhouette", "{seconds} seconds to name it", "+1 for every hero you get"]).map((r) =>
    fillTemplate(r, { seconds: settings.questionSeconds })
  );
  const footer = fillTemplate(I.footer || "{total} HEROES • {bonus} BONUS ROUNDS", { total: normalCount, bonus: bonusCount });
  return (
    <Shell id="Intro" dur={dur} soundFile="intro" build={(t) => {
      const out = pr(t, 4.3, 4.7); // everything leaves, then READY? lands
      const rdy = spring(pr(t, 4.5, 5.2));
      const flash = t >= 4.5 ? 0.7 * Math.pow(1 - pr(t, 4.5, 4.85), 2) : 0;
      return (
        <Frame t={t} dur={dur} wipeIn={false} wipeOut>
          <div style={{ left: 0, top: 110, width: 1600, opacity: 1 - out, fontFamily: "var(--display)", fontWeight: 900, fontSize: "var(--t-xl)", lineHeight: 0.95, letterSpacing: ".05em", textTransform: "uppercase", color: "#fff" }}>
            <Words text={I.title || "GUESS THE HERO"} t={t} t0={0.1} step={0.12} />
          </div>
          <div style={{ left: 0, top: 262, width: 1600, textAlign: "center", opacity: ex(pr(t, 0.7, 1.1)) * (1 - out), fontFamily: "var(--display)", fontWeight: 700, fontSize: "var(--t-m)", letterSpacing: ".22em", color: colors.series, textTransform: "uppercase" }}>
            {I.subtitle || "BY THE SILHOUETTE"}
          </div>
          {rules.map((r, i) => {
            const e = ex(pr(t, 0.9 + i * 0.85, 1.4 + i * 0.85));
            const s = spring(pr(t, 0.9 + i * 0.85, 1.7 + i * 0.85));
            return (
              <div key={i} style={{ left: 280, top: 372 + i * 112, width: 1040, height: 88, display: "flex", alignItems: "center", gap: 28, padding: "0 28px", borderRadius: 10,
                background: "rgba(255,255,255,.08)", border: "1.5px solid rgba(255,255,255,.2)", opacity: e * (1 - out),
                clipPath: `inset(0 ${((1 - e) * 100).toFixed(1)}% 0 0)`, transform: `translateX(${((1 - s) * -50 - out * 40).toFixed(1)}px)` }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: colors.series, color: colors.navy, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--display)", fontWeight: 900, fontSize: "var(--t-m)", lineHeight: 1 }}>{i + 1}</div>
                <div style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: "var(--t-m)", letterSpacing: ".04em", textTransform: "uppercase", color: "#fff" }}>{r}</div>
              </div>
            );
          })}
          <div style={{ left: 0, top: 770, width: 1600, textAlign: "center", opacity: ex(pr(t, 3.5, 3.9)) * (1 - out), fontFamily: "var(--display)", fontWeight: 700, fontSize: "var(--t-s)", letterSpacing: ".14em", color: colors.muted }}>
            {footer}
          </div>
          <div style={{ left: 0, top: 330, width: 1600, textAlign: "center", opacity: pr(t, 4.5, 4.62), transform: `scale(${(0.6 + 0.4 * rdy).toFixed(3)})`, fontFamily: "var(--display)", fontWeight: 900, fontSize: "var(--t-xl)", letterSpacing: ".08em", color: colors.mint, textTransform: "uppercase" }}>
            {I.go || "READY?"}
          </div>
          <div style={{ inset: 0, background: "#fff", opacity: flash, pointerEvents: "none" }} />
        </Frame>
      );
    }} />
  );
};

// ------------------------------------------------------------------------------------------------------------------------
// RECAP / SCORE CHECK: shown once, mid-video (after question settings.structure.recap.afterQuestion)
// ------------------------------------------------------------------------------------------------------------------------
export const Recap = () => {
  const R = ST.recap || {};
  const dur = cardSeconds("recap", 4.5);
  const after = R.afterQuestion ?? 25;
  const idx = rounds.findIndex((r) => Number(r.id) === Number(after) && (!r.type || r.type === "normal"));
  const done = idx >= 0 ? idx + 1 : Math.round(rounds.length / 2); // clips played so far
  const left = rounds.length - done;
  const frac = rounds.length ? done / rounds.length : 0.5;
  const BAR = 1000;
  return (
    <Shell id="Recap" dur={dur} soundFile="recap" build={(t) => {
      const fill = ex(pr(t, 0.75, 1.7));
      const pulse = 1 + 0.015 * Math.sin(t * 8);
      return (
        <Frame t={t} dur={dur} wipeIn wipeOut litFrom={0.3}>
          <div style={{ left: 0, top: 130, width: 1600, fontFamily: "var(--display)", fontWeight: 900, fontSize: "var(--t-xl)", lineHeight: 0.95, letterSpacing: ".05em", textTransform: "uppercase", color: "#fff" }}>
            <Words text={R.title || "SCORE CHECK"} t={t} t0={0.55} step={0.12} />
          </div>
          <div style={{ left: 0, top: 296, width: 1600, textAlign: "center", opacity: ex(pr(t, 0.9, 1.3)), fontFamily: "var(--display)", fontWeight: 800, fontSize: "var(--t-m)", letterSpacing: ".1em", textTransform: "uppercase", color: colors.mint }}>
            {fillTemplate(R.progress || "{done} DONE • {left} TO GO", { done, left })}
          </div>
          <div style={{ left: 300, top: 380, width: BAR, height: 16, borderRadius: 8, background: "rgba(255,255,255,.14)" }} />
          <div style={{ left: 300, top: 380, width: (BAR * frac * fill).toFixed(1) + "px", height: 16, borderRadius: 8, background: colors.mint }} />
          <div style={{ left: 0, top: 480, width: 1600, textAlign: "center", opacity: ex(pr(t, 1.5, 1.9)), transform: `scale(${pulse.toFixed(4)})`, fontFamily: "var(--display)", fontWeight: 900, fontSize: "var(--t-l)", letterSpacing: ".05em", textTransform: "uppercase", color: colors.series }}>
            {R.ask || "HOW MANY DID YOU GET?"}
          </div>
          <div style={{ left: 0, top: 590, width: 1600, textAlign: "center", opacity: ex(pr(t, 1.9, 2.3)), fontFamily: "var(--display)", fontWeight: 700, fontSize: "var(--t-s)", letterSpacing: ".14em", textTransform: "uppercase", color: colors.muted }}>
            {R.sub || "COMMENT YOUR SCORE SO FAR"}
          </div>
        </Frame>
      );
    }} />
  );
};

// ------------------------------------------------------------------------------------------------------------------------
// OUTRO: the single "How many did you get?" ask, score tiers (comment bait), subscribe line, fade to dark
// ------------------------------------------------------------------------------------------------------------------------
export const Outro = () => {
  const O = ST.outro || {};
  const dur = cardSeconds("outro", 8);
  const lines = O.titleLines || ["HOW MANY", "DID YOU GET?"];
  const tiers = tiersFor(scoreTotal, O.tierNames || ["LEGEND", "HERO", "SIDEKICK", "CIVILIAN"]);
  return (
    <Shell id="Outro" dur={dur} soundFile="outro" build={(t) => {
      const sub = spring(pr(t, 4.6, 5.4));
      return (
        <Frame t={t} dur={dur} wipeIn wipeOut={false} fadeOut litFrom={0.3}>
          {lines.map((ln, i) => (
            <div key={i} style={{ left: 0, top: 70 + i * 128, width: 1600, fontFamily: "var(--display)", fontWeight: 900, fontSize: "var(--t-xl)", lineHeight: 0.95, letterSpacing: ".05em", textTransform: "uppercase", color: i === lines.length - 1 ? colors.series : "#fff" }}>
              <Words text={ln} t={t} t0={0.6 + i * 0.25} step={0.1} />
            </div>
          ))}
          {tiers.map((tr, i) => {
            const e = ex(pr(t, 2.0 + i * 0.45, 2.5 + i * 0.45));
            return (
              <div key={i} style={{ left: 480, top: 400 + i * 74, width: 640, height: 60, display: "flex", alignItems: "center", gap: 28, opacity: e, clipPath: `inset(0 ${((1 - e) * 100).toFixed(1)}% 0 0)`, transform: `translateX(${((1 - e) * 40).toFixed(1)}px)` }}>
                <div style={{ width: 220, textAlign: "right", fontFamily: "var(--display)", fontWeight: 900, fontSize: "var(--t-m)", letterSpacing: ".04em", color: colors.series }}>{tr.range}</div>
                <div style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: "var(--t-m)", letterSpacing: ".1em", textTransform: "uppercase", color: "#fff" }}>{tr.name}</div>
              </div>
            );
          })}
          <div style={{ left: 380, top: 730, width: 840, height: 76, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 12, background: colors.brandPink || "#ff4d8d", opacity: pr(t, 4.6, 4.8), transform: `scale(${(0.7 + 0.3 * sub).toFixed(3)})`,
            fontFamily: "var(--display)", fontWeight: 900, fontSize: "var(--t-m)", letterSpacing: ".08em", textTransform: "uppercase", color: "#fff" }}>
            {O.subscribe || "SUBSCRIBE FOR MORE HERO QUIZZES"}
          </div>
        </Frame>
      );
    }} />
  );
};
