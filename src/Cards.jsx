// Long-video structure cards: Teaser (2 s cold open), Intro (3 s rules), Recap / score check (mid-video), Outro.
// Same look as the quiz clips (brand background, fonts, type scale, grain); all text + timing in settings.json -> structure.
import React from "react";
import { AbsoluteFill, Audio, Freeze, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import settings from "../settings.json";
import rounds from "./rounds.json";
import { prog as pr, lerp, power2InOut as eio, expoOut as ex } from "./gsap-helpers";
import { Round } from "./Round";
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
// INTRO: title + rules condensed to 3 s (settings.structure.intro.seconds). Times are relative to dur so they
// scale gracefully if the author changes the duration again.
// ------------------------------------------------------------------------------------------------------------------------
export const Intro = () => {
  const I = ST.intro || {};
  const dur = cardSeconds("intro", 3);       // now 3 s by default
  const rules = (I.rules || ["Spot the silhouette", "{seconds} seconds to name it", "+1 for every character you get"]).map((r) =>
    fillTemplate(r, { seconds: settings.questionSeconds })
  );
  const footer = fillTemplate(I.footer || "{total} CHARACTERS • {bonus} BONUS ROUNDS", { total: normalCount, bonus: bonusCount });

  // Dynamic timing anchors relative to `dur` so they always fit regardless of the value in settings.json.
  // "READY?" lands at 80 % of the card and holds through the wipe-out.
  const rdyAt   = dur * 0.78;
  const outAt   = dur * 0.72; // content exits just before READY? arrives
  const outDur  = 0.22;
  const rdyDur  = 0.4;

  return (
    <Shell id="Intro" dur={dur} soundFile="intro" build={(t) => {
      const out   = pr(t, outAt, outAt + outDur);
      const rdy   = spring(pr(t, rdyAt, rdyAt + rdyDur));
      const flash = t >= rdyAt ? 0.7 * Math.pow(1 - pr(t, rdyAt, rdyAt + 0.3), 2) : 0;
      return (
        <Frame t={t} dur={dur} wipeIn={false} wipeOut>
          {/* Title */}
          <div style={{ left: 0, top: 100, width: 1600, opacity: 1 - out, fontFamily: "var(--display)", fontWeight: 900, fontSize: "var(--t-xl)", lineHeight: 0.95, letterSpacing: ".05em", textTransform: "uppercase", color: "#fff" }}>
            <Words text={I.title || "GUESS THE CHARACTER"} t={t} t0={0.05} step={0.08} />
          </div>
          {/* Subtitle */}
          <div style={{ left: 0, top: 248, width: 1600, textAlign: "center", opacity: ex(pr(t, 0.3, 0.6)) * (1 - out), fontFamily: "var(--display)", fontWeight: 700, fontSize: "var(--t-m)", letterSpacing: ".22em", color: colors.series, textTransform: "uppercase" }}>
            {I.subtitle || "BY THE SILHOUETTE"}
          </div>
          {/* Three rules — compressed entry times */}
          {rules.map((r, i) => {
            const e = ex(pr(t, 0.4 + i * 0.42, 0.75 + i * 0.42));
            const s = spring(pr(t, 0.4 + i * 0.42, 0.9 + i * 0.42));
            return (
              <div key={i} style={{ left: 280, top: 348 + i * 102, width: 1040, height: 84, display: "flex", alignItems: "center", gap: 28, padding: "0 28px", borderRadius: 10,
                background: "rgba(255,255,255,.08)", border: "1.5px solid rgba(255,255,255,.2)", opacity: e * (1 - out),
                clipPath: `inset(0 ${((1 - e) * 100).toFixed(1)}% 0 0)`, transform: `translateX(${((1 - s) * -50 - out * 40).toFixed(1)}px)` }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: colors.series, color: colors.navy, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--display)", fontWeight: 900, fontSize: "var(--t-m)", lineHeight: 1 }}>{i + 1}</div>
                <div style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: "var(--t-m)", letterSpacing: ".04em", textTransform: "uppercase", color: "#fff" }}>{r}</div>
              </div>
            );
          })}
          {/* Footer count */}
          <div style={{ left: 0, top: 756, width: 1600, textAlign: "center", opacity: ex(pr(t, 1.4, 1.7)) * (1 - out), fontFamily: "var(--display)", fontWeight: 700, fontSize: "var(--t-s)", letterSpacing: ".14em", color: colors.muted }}>
            {footer}
          </div>
          {/* READY? */}
          <div style={{ left: 0, top: 320, width: 1600, textAlign: "center", opacity: pr(t, rdyAt, rdyAt + 0.12), transform: `scale(${(0.6 + 0.4 * rdy).toFixed(3)})`, fontFamily: "var(--display)", fontWeight: 900, fontSize: "var(--t-xl)", letterSpacing: ".08em", color: colors.mint, textTransform: "uppercase" }}>
            {I.go || "READY?"}
          </div>
          <div style={{ inset: 0, background: "#fff", opacity: flash, pointerEvents: "none" }} />
        </Frame>
      );
    }} />
  );
};

// ------------------------------------------------------------------------------------------------------------------------
// TEASER: 2-second cold-open before the Intro. Three freeze-frames from hand-picked reveal moments (settings.structure.intro.teaserIds),
// each shown for ~0.6 s with a "Can you name all 50?" overlay. No audio file — it uses the whoosh panel wipe only.
// Frame-locked to the reveal pop (Q + 0.1 s) of each chosen round so the colour hero is visible but no name text yet.
// ------------------------------------------------------------------------------------------------------------------------
export const Teaser = () => {
  const I      = ST.intro || {};
  const dur    = Math.max(1, (I.teaserSeconds ?? 2));
  const ids    = I.teaserIds || [1, 15, 36];
  const label  = I.teaserText || "Can you name all 50?";
  const FPS_   = settings.fps;
  const Q_     = settings.questionSeconds;
  // The freeze frame we want: a fraction of a second into the colour reveal (before the name overlay appears)
  const revealFrame = Math.round((Q_ + 0.1) * FPS_);

  // Each panel occupies dur/3 seconds; they cross-fade.
  const slotDur   = dur / ids.length;
  const xfadeDur  = Math.min(0.18, slotDur * 0.28);

  // Wipe-out panels (same mechanic as Frame)
  const panelXFn = (t, k) => {
    if (t > dur - 0.5) return -2600 + eio(pr(t, dur - 0.5 + k * 0.05, dur - 0.12 + k * 0.05)) * 2000;
    return -2600;
  };

  return (() => {
    const frame = useCurrentFrame();
    const { width } = useVideoConfig();
    const fontsReady = useFonts();
    usePreloadImage(staticFile("fx/grain.png"));
    const t = frame / FPS_;

    // Per-panel opacity with cross-fade
    const panelOp = ids.map((_, i) => {
      const t0 = i * slotDur;
      const t1 = (i + 1) * slotDur;
      const fadeIn  = i === 0 ? ex(pr(t, 0, 0.25)) : ex(pr(t, t0 - xfadeDur, t0 + xfadeDur));
      const fadeOut = i === ids.length - 1 ? 1 : 1 - ex(pr(t, t1 - xfadeDur, t1 + xfadeDur));
      return Number((fadeIn * fadeOut).toFixed(3));
    });

    // "Can you name all 50?" text — fades in quickly, stays, exits with wipe
    const textE = ex(pr(t, 0.1, 0.5)) * (1 - pr(t, dur - 0.5, dur - 0.2));

    return (
      <AbsoluteFill style={{ background: "#070b1e" }}>
        <style>{buildCss(colors, colors.series, TY)}</style>
        <div id="stage" style={{ transform: `scale(${width / 1600})`, opacity: fontsReady ? 1 : 0 }}>
          {/* Stack the freeze-frame panels; each is a full-frame Round at its reveal moment */}
          {ids.map((roundId, i) => (
            <div key={roundId} style={{ position: "absolute", left: 0, top: 0, width: 1600, height: 900, opacity: panelOp[i], pointerEvents: "none" }}>
              <Freeze frame={revealFrame}>
                <Round roundId={roundId} motionBlur={false} />
              </Freeze>
            </div>
          ))}

          {/* Dark vignette overlay so the text sits cleanly */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(5,8,20,.62) 0%, rgba(5,8,20,.0) 35%, rgba(5,8,20,.0) 55%, rgba(5,8,20,.72) 100%)", pointerEvents: "none" }} />

          {/* "Can you name all 50?" */}
          <div style={{
            position: "absolute",
            left: 0,
            bottom: 110,
            width: 1600,
            textAlign: "center",
            fontFamily: "var(--display)",
            fontWeight: 900,
            fontSize: TY.l,
            letterSpacing: ".06em",
            textTransform: "uppercase",
            color: "#fff",
            opacity: textE,
            transform: `translateY(${((1 - ex(pr(t, 0.1, 0.5))) * 28).toFixed(1)}px)`,
            pointerEvents: "none",
          }}>
            {label.split(/\s+/).map((w, wi) => (
              <span key={wi} style={{ display: "inline-block", marginRight: "0.28em" }}>{w}</span>
            ))}
          </div>

          {/* Grain */}
          <div className="grain" style={{ position: "absolute", inset: 0, backgroundImage: `url(${staticFile("fx/grain.png")})`, backgroundSize: "160px 160px", pointerEvents: "none" }} />

          {/* Wipe-out panels */}
          <div className="pn" style={{ position: "absolute", background: colors.series, transform: `translateX(${panelXFn(t, 0).toFixed(1)}px) skewX(-12deg)` }} />
          <div className="pn" style={{ position: "absolute", background: colors.navy2, transform: `translateX(${panelXFn(t, 1).toFixed(1)}px) skewX(-12deg)` }} />
        </div>
      </AbsoluteFill>
    );
  })();
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
