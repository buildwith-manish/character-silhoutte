import React, { useRef } from "react";
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import settings from "../settings.json";
import rounds from "./rounds.json";
import { CameraMotionBlur } from "@remotion/motion-blur";
import { T } from "./timing";
import { DustCone, BgMotes, FgMotes, Burst } from "./Depth";
import { Motif } from "./Motif";
import { CaFilter, Rays, LensFlare } from "./Reveal";
import {
  prog as pr,
  lerp,
  clamp as cl,
  power2Out as eo,
  power4Out as eo5,
  power2InOut as eio,
  backOutClassic as eb,
  expoOut as ex,
} from "./gsap-helpers";
import { buildCss } from "./style";
import { varietyFor } from "./variation";
import { buildSlots } from "./letterHints";
import { colourSVG, silhouetteSVG } from "./hero-svg";
import { findRound, fillTemplate, useFit, useFonts, usePreloadImage, useHeroColor, hexToRgb, mixRgb, lookFor, pickAccent } from "./util";

const { Q, H, W } = T;
const N = T.segments;
const R0 = 74;
const C = 2 * Math.PI * R0;
const GAP = 4;
const SEG_LEN = C / N - (C * GAP) / 360;
const BAR_W = 1440;

const f1 = (x) => Number(x.toFixed(1));

// Auto-assign a body-part peek per hero. Keyed by hero name (lowercase, no punctuation).
// Heroes with iconic weapons → weapon; heroes with chest emblems → chest; etc.
const PEEK_PART_OVERRIDE = {
  // Weapons
  "thor": "weapon", "iron man": "chest", "captain america": "weapon", "hawkeye": "weapon",
  "wolverine": "hand", "deadpool": "weapon", "punisher": "chest", "blade": "weapon",
  "ghost rider": "weapon", "iron fist": "hand", "gambit": "hand", "elektra": "weapon",
  "moon knight": "weapon", "magneto": "hand", "doctor strange": "hand",
  // Chest emblems
  "superman": "chest", "batman": "chest", "spider-man": "chest", "black panther": "chest",
  "wonder woman": "chest", "flash": "chest", "green lantern": "chest", "shazam": "chest",
  "captain marvel": "chest", "ms. marvel": "chest", "nova": "chest",
  // Hands / claws
  "hulk": "hand", "the thing": "hand", "beast": "hand", "colossus": "hand",
  // Eyes / mask focus
  "black widow": "eye", "winter soldier": "eye", "nightcrawler": "eye", "gambit": "eye",
  // Legs
  "quicksilver": "leg", "flash": "leg", "black canary": "leg",
};

function peekPartFor(heroName) {
  const key = String(heroName || "").toLowerCase().replace(/[^a-z .]/g, "").trim();
  // Direct override
  if (PEEK_PART_OVERRIDE[key]) return PEEK_PART_OVERRIDE[key];
  // Partial-match fallback: check if any override key is a substring of the hero name
  for (const k of Object.keys(PEEK_PART_OVERRIDE)) {
    if (key.includes(k) || k.includes(key)) return PEEK_PART_OVERRIDE[k];
  }
  // Default: chest (most heroes have an emblem or distinctive chest detail)
  return "chest";
}

// Per-round variety (seeded beats, calm / big reveal, wipe only on bonus rounds): see src/variation.js and settings.json -> variety.
const varietyOf = (round) =>
  varietyFor(round, settings, round.total ?? (settings.progress && settings.progress.total) ?? rounds.length);

const Scene = ({ roundId, hookVariant, animatic }) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const fontsReady = useFonts();

  const round = findRound(rounds, roundId);
  if (!round) throw new Error(`Round ${roundId} not found in src/rounds.json. Run "npm run csv".`);

  const VR = varietyOf(round);
  const J = VR.j; // seeded timing of the pre-reveal beats
  const { text, colors } = settings;
  const TY =settings.type || { xl: 128, l: 72, m: 44, s: 28 }; // the only four type sizes in the template
  // Bonus rounds: round.type = eye | weapon | half | fake | blur (settings.bonus.types). Everything else is a normal question.
  const BN = settings.bonus || {};
  const btype = round.type && round.type !== "normal" ? round.type : null;
  const BT = btype && BN.types ? BN.types[btype] : null;
  const isBonus = Boolean(BT);
  const detail = isBonus && (btype === "eye" || btype === "weapon"); // camera stays tight on one colour detail of the hero
  const look = isBonus && BN.look ? { key: "bonus", ...BN.look } : lookFor(settings.universes, round.universe); // per-universe grade + motif + accent
  const series = pickAccent(round.seriesColor, colors.series, look);
  const usePng = Boolean(round.hasImage && round.imageFile);
  const imgSrc = usePng ? staticFile(`images/${round.imageFile}`) : null;
  usePreloadImage(imgSrc);
  const decoySrc = round.hasDecoy && round.decoyFile ? staticFile(`images/${round.decoyFile}`) : imgSrc; // "fake" round: no decoy file = the hero mirrored
  usePreloadImage(decoySrc !== imgSrc ? decoySrc : null);
  // Hero colour: explicit round.heroColor, else sampled from the PNG, else the accent (placeholder hero). Tints rim light + reveal glow.
  const tintOn = !settings.heroTint || settings.heroTint.enabled !== false;
  const sampled = useHeroColor(tintOn && !round.heroColor ? imgSrc : null, hexToRgb(series));
  const heroRgb = !tintOn ? [255, 190, 90] : round.heroColor ? hexToRgb(round.heroColor) : sampled;
  const gl = mixRgb(heroRgb, [255, 255, 255], 0.25).join(","); // glow
  const hotC = mixRgb(heroRgb, [255, 255, 255], 0.7).join(","); // hottest part of flare / sparks
  const midC = mixRgb(heroRgb, [255, 255, 255], 0.35).join(",");
  const heroStr = heroRgb.join(",");
  usePreloadImage(staticFile("fx/grain.png")); // dither grain must be decoded before the first frame renders

  const tr = frame / T.fps; // real clip time: drives shake and the chromatic split (they keep going during the hit-stop)
  // Hit-stop: the picture holds on the impact frame for a few frames, then catches up to the audio over ~2.4 s (imperceptible),
  // so the wipe-out at the end is back in sync with its sound.
  const FZ = Math.max(0, (VR.fx.freezeFrames - 0.5) / T.fps); // calm reveals hold 1 frame, big reveals hold settings.reveal.freezeFrames
  const t = tr < Q ? tr : tr < Q + FZ ? Q : tr - FZ * (1 - pr(tr, Q + FZ, Q + 2.4));
  const preQ = t < Q;

  // ---- motion vocabulary -----------------------------------------------------------------------------------------
  const RV = settings.reveal;
  // Hook (retention): frame 0 is already a tight, lit crop of the silhouette; the camera dollies out to the full frame in ~1 s.
  // Set settings.hook.enabled = false to get the old slow intro back.
  const HK0 = settings.hook && settings.hook.enabled && !detail ? settings.hook : null;
  const HK = HK0 ? { ...HK0, ...((hookVariant && HK0.variants && HK0.variants[hookVariant]) || {}) } : null; // A/B/C hook variants: npm run render:batch -- --hook B
  const lit = Boolean(HK0 || detail); // fast intro (lit stage on frame 0, UI inside the first second); detail rounds are already a tight crop
  const spring = (p) => (p <= 0 ? 0 : p >= 1 ? 1 : 1 - Math.exp(-7 * p) * Math.cos(15 * p)); // damped overshoot, 0 -> 1
  const stutter = (t0, dur, depth) => { // light flicker inside [t0, t0 + dur]
    const x = t - t0;
    if (x < 0 || x > dur) return 1;
    return Math.sin(x * 140) + Math.sin(x * 91 + 1) > 0.1 ? 1 : 1 - depth * (1 - x / dur);
  };

  // ---- camera, stage lights ------------------------------------------------
  const rev = pr(t, Q, Q + 1.6);
  // spotlight: fast-in, slow-settle. With the hook the stage is already ~70% lit on frame 0 (nothing starts from black).
  const hi = lit ? 0.72 + 0.28 * ex(pr(t, 0.1, 1.1)) : ex(pr(t, 0.15, 1.1));
  const heroIn = lit ? spring(pr(t, 0.1, 1.0)) : spring(pr(t, 0.3, 1.5)); // hero settles with a small overshoot
  // hook camera: 1 on frame 0 (tight crop), holds for holdSeconds, then eases to 0 (full frame)
  const hk = HK ? 1 - eio(pr(t, HK.holdSeconds, HK.holdSeconds + HK.pullSeconds)) : 0;
  const br = Math.sin(t * 1.4);
  const base = preQ ? 0.04 * eio(pr(t, 0, Q)) : 0.04 * (1 - eo(pr(t, Q, Q + 1.4)));
  const bump = -0.015 * eo(pr(t, Q - 0.25, Q));
  const D3 = settings.depth;
  // anticipation: for a beat before the reveal the lights dim and the hero shrinks; then everything bursts
  const dipK = preQ ? eio(pr(t, Q - 0.4, Q - 0.1)) : 0;
  const antiSc = preQ ? 0.06 * Math.pow(pr(t, Q - 0.4, Q - 0.04), 2) : 0;
  // pattern interrupts while the silhouette waits: light flickers (2.15, 3.85, 6.05), camera slide + roll (3.0-5.0), glitch (3.85), push (5.6)
  // (the times are seeded per round, see src/variation.js; legacy values are 2.15 / 3.85 / 6.05 flickers, pan 3.0, kick 5.6)
  const G = J.glitch; // null = this clip has no glitch
  const lightFlick = stutter(J.flickA, 0.32, 0.6) * (G !== null ? stutter(G, 0.22, 0.5) : 1) * stutter(J.flickC, 0.2, 0.45);
  const panE = J.panDir * (ex(pr(t, J.panStart, J.panStart + 0.7)) - ex(pr(t, J.panStart + 1.2, J.panStart + 2.0)));
  const kick = t >= J.kick && t < J.kick + 0.4 ? 0.014 * Math.pow(1 - pr(t, J.kick, J.kick + 0.4), 2) : 0;
  const glitchX = G !== null && t >= G && t < G + 0.25 ? Math.sin((t - G) * 130) * 3 * (1 - (t - G) / 0.25) : 0;
  const rimFlash = G !== null && t >= G && t < G + 0.35 ? 16 * (1 - (t - G) / 0.35) : 0;
  // intro dolly + snap-zoom that overshoots outwards and settles (follow-through)
  const introPush = D3.introPush * (1 - eo(pr(t, 0, 1.4)));
  const snap = t >= Q ? RV.snapZoom * VR.fx.snapZoom * (1 - spring(pr(t, Q, Q + 0.9))) : bump;
  // detail rounds (eye / weapon): the camera holds a tight crop of the coloured spot until the reveal, then dollies out
  const dz = detail ? 1 - eio(pr(t, Q - 0.1, Q + 0.9)) : 0;
  const dZ = detail ? BT.zoom : 1;
  const dpx = round.peekX ?? (BT && BT.peekX) ?? 50, dpy = round.peekY ?? (BT && BT.peekY) ?? 15;
  const dx0 = 800 + (607 + (386 * dpx) / 100 - 800) * 1.14, dy0 = 670 + (130 + (540 * dpy) / 100 - 670) * 1.14; // spot position after the hero's own 1.14 scale
  const camScale = 1 + base + snap + introPush + kick + (HK ? HK.zoom * hk : 0) + (dZ - 1) * dz;
  const sk = (tr >= Q ? Math.pow(1 - pr(tr, Q, Q + 0.45), 2) : 0) * VR.fx.shake; // impact shake (calm reveals: ~35%) (real time, so it also runs through the freeze)
  const camX = D3.driftX * Math.sin(t * 0.42) + 42 * panE + 9 * Math.sin((tr - Q) * 70) * sk + (dx0 - 800) * dZ * dz;
  const camY = D3.driftY * Math.cos(t * 0.33) + 12 * sk + 5 * Math.cos((tr - Q) * 60) * sk - (HK ? HK.shiftY * hk : 0) + ((dy0 - 430) * dZ - 20) * dz;
  const camRoll = 0.9 * panE + 1.6 * (RV.rollShake ?? 1) * Math.sin((tr - Q) * 45) * sk; // degrees (impact roll off: reveal.rollShake = 0)
  const layerTf = (k) =>
    `translate(${(-camX * k).toFixed(2)}px, ${(-camY * k).toFixed(2)}px) scale(${(1 + (camScale - 1) * k).toFixed(4)}) rotate(${(camRoll * k * 0.5).toFixed(3)}deg)`;

  const dim = 1 - 0.5 * dipK;
  const coneOpacity = hi * (1 - 0.55 * rev) * dim * lightFlick;
  const coneRot = Math.sin(t * 0.5) * 1.4;
  const blcOpacity = hi * (1 - 0.65 * rev) * dim * lightFlick;
  const discOpacity = hi * (1 - 0.85 * rev) * dim * lightFlick;
  const discScale = 1 + 0.025 * Math.sin(t * 1.1) + (t >= Q ? 0.16 * ex(pr(t, Q, Q + 0.7)) : 0);
  // Clips without a wipe-out (normal rounds) keep the finished reveal on screen to the very end of the clip instead of leaving at W.
  const endT = VR.wipeOut ? W : T.D;
  const blwOpacity = preQ ? 0 : eo(pr(t, Q, Q + 0.6)) * (1 - 0.2 * pr(t, endT - 1, endT));
  const caAmt = tr >= Q ? RV.caPx * VR.fx.ca * Math.exp(-(tr - Q) * 13) : 0; // chromatic split (px on the 1600 grid), decays in ~0.25 s

  // ---- hero ----------------------------------------------------------------
  const urg = preQ ? pr(t, Q - T.urgencySeconds, Q) : 0;
  const glow = preQ ? 22 + urg * 14 * (0.5 + 0.5 * Math.sin(t * 14)) + rimFlash + (HK ? HK.rimPx * (1 - pr(t, 0, 0.8)) : 0) : 30 * (1 - rev) + 60 * Math.exp(-(t - Q) * 8);
  // rim light: pale blue-white nudged toward the hero's colour before the reveal; the hero's own glow colour after it
  const rim = preQ ? `rgba(${mixRgb(heroRgb, [190, 210, 255], 0.5).join(",")},.95)` : `rgba(${gl},.8)`;
  const pre = preQ ? 0.025 * eo(pr(t, Q - 0.3, Q)) : 0;
  // pop: the hero snaps up on the hit, then settles back with a small overshoot (follow-through)
  const pop = t >= Q ? VR.fx.pop * (0.1 * Math.exp(-(t - Q) * 9) - 0.06 * (1 - spring(pr(t, Q, Q + 0.9)))) : 0;
  const fake = isBonus && btype === "fake"; // two heroes side by side, one is a fake
  const realLeft = (round.realSide || (round.id % 2 ? "left" : "right")) === "left";
  const fakeDx = fake ? (realLeft ? -210 : 210) : 0;
  const fakeSc = fake ? 0.78 : 1;
  const rcx = 800 + fakeDx; // centre of the reveal effects (the real hero)
  const half = isBonus && btype === "half"; // only one half of the hero is shown until the reveal
  const showLeft = (round.half || (round.id % 2 ? "left" : "right")) === "left";
  const hp = ex(pr(t, Q, Q + 0.5));
  const halfClip = half ? (showLeft ? `inset(-10% ${(50 - 140 * hp).toFixed(1)}% -10% -90%)` : `inset(-10% -90% -10% ${(50 - 140 * hp).toFixed(1)}%)`) : undefined;
  const heroTransform = `translate(${(glitchX + fakeDx).toFixed(2)}px, ${((1 - heroIn) * (lit ? 14 : 50) + br * 4).toFixed(2)}px) scale(${(1.14 * fakeSc * (1 + 0.01 * br - antiSc + pop)).toFixed(4)})`;
  const shadowScale = (preQ ? 1 - 1.2 * antiSc : 1 + 0.4 * Math.exp(-(t - Q) * 6)) + 0.03 * br;
  // During the pre-reveal silhouette phase, NO drop-shadow (pure black silhouette).
  // At the reveal, the full colored rim kicks in.
  const heroFilter = preQ
    ? `blur(${((1 - hi) * (HK ? HK.focusBlurPx : lit ? 5 : 12)).toFixed(1)}px)`
    : `blur(${((1 - hi) * (HK ? HK.focusBlurPx : lit ? 5 : 12)).toFixed(1)}px) drop-shadow(0 0 ${glow.toFixed(1)}px ${rim})`;
  const capeAng = Math.sin(t * 1.9) * 1.3 + Math.sin(t * 3) * 0.6;

  // light band sweeps (1.6-3.0 s and 4.9-6.3 s)
  const s1 = pr(t, 1.6, 3);
  const s2 = pr(t, 4.9, 6.3);
  let sweepE = null;
  if (s1 > 0 && s1 < 1) sweepE = eio(s1);
  else if (s2 > 0 && s2 < 1) sweepE = eio(s2);
  const bandSvgX = sweepE == null ? -140 : lerp(-140, 520, sweepE);
  // PNG mode: same sweep range as the SVG (-140..520 in the 400-unit hero box), converted to px in the 960px image layer
  // (hero box is 386px wide and sits at x=287 inside the layer; 386/400 = 0.965 px per unit)
  const bandPngX = 287 + bandSvgX * 0.965;

  // colour reveal: expanding circle (0 -> 640 px)
  const Rr = ex(pr(t, Q, Q + 0.75)) * 700;
  const blurRound = isBonus && btype === "blur"; // the hero is in colour but out of focus; it sharpens with the countdown and snaps sharp at the reveal
  const RrClip = blurRound ? 900 : Rr;
  const focusPx = blurRound ? (t < Q ? lerp(BT.blurStart, BT.blurEnd, eo(pr(t, 0.3, Q - 0.3))) : BT.blurEnd * (1 - pr(t, Q, Q + 0.3))) : 0;
  const rvOpacity = t >= Q ? 1 - pr(t, Q + 0.2, Q + 0.9) : 0;
  const shock = [0, 1].map((k) => {
    const p = pr(t - Q - k * 0.12, 0, 0.9);
    return {
      opacity: t >= Q && p > 0 && p < 1 && (k === 0 || VR.fx.shock2) ? Number((0.7 * (1 - p)).toFixed(3)) : 0,
      transform: `scale(${(0.4 + 2.6 * eo(p)).toFixed(3)})`,
    };
  });

  // ---- header, watermark, prompt -------------------------------------------
  // With the hook the UI lands inside the first second (question first, then header / watermark / bar / ring).
  const h = lit ? ex(pr(t, 0.3, 0.85)) : ex(pr(t, 0.45, 1.15));
  const wmE = lit ? ex(pr(t, 0.5, 1.0)) : ex(pr(t, 0.8, 1.4));
  // Watermark glint + breathing glow (Zoom-Out style)
  const wmGlint = cl((Math.max(0, t - 1.6) % 8) / (8 * 0.15), 0, 1);
  const wmBreathe = 0.5 + 0.5 * Math.sin((t / 3.4) * Math.PI * 2);
  const wmParts = String(text.watermark || "QUIZ MATRIX").trim().split(/\s+/);
  const wmLast = wmParts.length > 1 ? wmParts.pop() : "";
  const wmFirst = wmParts.join(" ") || wmLast;
  const barIn = lit ? ex(pr(t, 0.35, 0.95)) : ex(pr(t, 0.55, 1.3));
  // Normal rounds: the prompt follows the character's role (settings.text.promptByRole), falling back to text.promptText.
  const rolePrompt = (text.promptByRole && round.role && text.promptByRole[round.role]) || text.promptText;
  const words = String(isBonus ? BT.prompt : rolePrompt).trim().split(/\s+/);
  // #pr is 440px wide (376px of text) and each word is nowrap: long words (SUPERHEROINE?) shrink the prompt so they never clip.
  const longestWord = words.reduce((m, w) => Math.max(m, w.length), 1);
  const promptFont = Math.min(TY.l, Math.floor(376 / (longestWord * 0.55)));

  // ---- countdown ring --------------------------------------------------------
  const ri = lit ? eb(pr(t, 0.55, 1.1)) : eb(pr(t, 0.85, 1.5));
  // Ring fades out at the reveal moment — the "+1 / YOUR SCORE" post-reveal display is removed per request.
  // The countdown (7,6,5...) stays fully visible during the question phase, then disappears with the flash.
  const ringFade = preQ ? 1 : cl(1 - pr(t, Q, Q + 0.3), 0, 1);
  const rc = cl(ri, 0, 1) * ringFade;
  const redFrom = T.Q - T.redSeconds;
  const sec = t % 1;
  const segColor = (i) => (preQ ? (i >= N - T.redSeconds ? colors.red : series) : colors.mint);
  // squash & stretch: the number arrives stretched, lands squashed, then wobbles to rest
  const squash = (u, base, k = 1) => {
    const d = k * (u < 0.12 ? lerp(0.18, -0.16, u / 0.12) : -0.16 * Math.exp(-(u - 0.12) * 14) * Math.cos((u - 0.12) * 30));
    return [base * (1 - 0.6 * d), base * (1 + d)];
  };
  let numText, numSize, numScale, numColor, ripOpacity, ripScale, ripColor, ringLabel;
  if (preQ) {
    numText = Math.max(1, Math.ceil(Q - t - 1e-6));
    numSize = TY.xl;
    numScale = squash(sec, 1 + 0.3 * (1 - ex(cl(sec / 0.3, 0, 1))));
    numColor = t >= redFrom ? colors.red : "#fff";
    const rp = pr(sec, 0, 0.6);
    ripOpacity = t >= 0.6 ? 0.5 * (1 - rp) : 0;
    ripScale = 1 + 0.4 * eo(rp);
    ripColor = t >= redFrom ? colors.red : series;
    ringLabel = text.secondsLabel;
  } else {
    numText = text.scoreText;
    numSize = TY.xl;
    numScale = squash(cl(t - Q - 0.1, 0, 1), 0.4 + 0.6 * eb(pr(t, Q + 0.1, Q + 0.65)), 0.7);
    numColor = colors.mint;
    const rp2 = pr(t, Q + 0.05, Q + 0.8);
    ripOpacity = 0.6 * (1 - rp2);
    ripScale = 1 + 0.8 * eo(rp2);
    ripColor = colors.mint;
    ringLabel = text.scoreLabel;
  }

  // ---- question / fact cards ----------------------------------------------------
  // question card (right side, same spot as the fact card) + fact card timing
  const qIn = lit ? ex(pr(t, 0.05, 0.6)) : ex(pr(t, 0.5, 1.1));
  const qOut = eio(pr(t, Q - 0.15, Q + 0.12));
  // Two-beat reveal: the name stamps in first and gets read, THEN the fact card enters (settings.factCard.appearSeconds after the reveal).
  const fA = Q + ((settings.factCard && settings.factCard.appearSeconds) ?? 0.6);
  const fn = ex(pr(t, fA, fA + 0.5));
  const fs = spring(pr(t, fA, fA + 0.9));

  // ---- letter-slot hints (src/letterHints.js, settings.letterHints) ------------------------------------------------------
  // One tile per character of the name. Hint 1 fills in at hint1AtSeconds, hint 2 at hint2AtSeconds (default: hintAtSeconds, where
  // the ping + riser sit). Only those two exact positions fill in. The old text hint card is gone.
  const nameChars = Array.from(String(round.heroName).toUpperCase()); 
  const LH = settings.letterHints || { enabled: false };
  const slotsOn = Boolean(LH.enabled && !(isBonus && (LH.skipTypes || []).includes(btype)));
  const slots = slotsOn ? buildSlots(round.heroName, { maxRatio: LH.maxRatio, positions: round.hintPositions }) : [];
  const slotW = (s) => (s.letter ? LH.tileW : s.ch === " " ? LH.spaceW : LH.fixedW);
  const slotRowW = slots.reduce((a, s) => a + slotW(s), 0) + (LH.gap || 0) * Math.max(0, slots.length - 1);
  const slotScale = slotRowW > 0 ? Math.min(1, LH.maxWidth / slotRowW) : 1; // long names shrink instead of overflowing
  const hintT = [0, LH.hint1AtSeconds ?? 3, LH.hint2AtSeconds ?? H]; // seconds at which hint 1 / hint 2 fill in
  const GLYPH = { W: 0.8, M: 0.745 }; // the only two letters wider than a tile at name size: squeezed a little to fit

  // ---- boxes stay through the reveal ----------------------------------------------------------------------
  // The tile row never disappears. At the reveal every still-empty tile fills in with its letter (same pop / flash / glint
  // as a hint), staggered left to right, and stays in its box. Hinted tiles are already filled and keep their look.
  const FILL_START  = Q + 0.05;  // first empty tile pops in
  const FILL_SPREAD = 0.45;      // time between the first and the last tile
  const letterCount = Math.max(1, slots.filter((s) => s.letter).length);
  let fillIdx = 0;
  const slotFillT = slots.map((s) => {
    if (!s.letter) return null;
    const frac = fillIdx / Math.max(1, letterCount - 1);
    fillIdx++;
    return s.hint ? hintT[s.hint] : FILL_START + frac * FILL_SPREAD;
  });
  const boxesOn = slotsOn && slots.length > 0; // the name is shown inside the boxes, so the plain #nm text stays hidden

  // ---- progress tracker ("12 / 50") and end-card CTA --------------------------------------------------------------------
  const PG = settings.progress || { enabled: false };
  const total = round.total ?? PG.total ?? rounds.length;
  const trkE = lit ? ex(pr(t, 0.4, 0.9)) : ex(pr(t, 0.7, 1.3));
  const CT = settings.cta || { enabled: false };
  const isCta = Boolean(CT.enabled && (round.cta === true || (CT.lastN > 0 && !isBonus && round.id > total - CT.lastN)));
  const ctaT = Q + (CT.startSeconds ?? 1.9);
  const cn = ex(pr(t, ctaT, ctaT + 0.5));
  const cs = spring(pr(t, ctaT, ctaT + 0.8));

  // ---- difficulty badge (EASY / MEDIUM / HARD) ---------------------------------
  // Derived from the round id using settings.difficulty.ranges. Bonus rounds do NOT show a difficulty badge.
  const DF = settings.difficulty || { enabled: false };
  const diffLevel = (() => {
    if (!DF.enabled || isBonus) return null;
    const id = Number(round.id);
    const R = DF.ranges || {};
    for (const k of ["easy", "medium", "hard"]) {
      const [a, b] = R[k] || [0, 0];
      if (id >= a && id <= b) return k;
    }
    return null;
  })();
  const diffLabel = diffLevel ? (DF.labels || {})[diffLevel] || diffLevel.toUpperCase() : null;
  const diffColor = diffLevel ? colors[diffLevel] : null;
  const diffShow = Boolean(diffLabel) && DF.enabled;
  const diffE = cl(trkE, 0, 1);  // same entrance as the tracker
  const diffFlame = diffLevel === "hard" && (DF.flameOnHard !== false);
  const factOut = isCta ? pr(t, ctaT - 0.2, ctaT) : 0; // on CTA clips the fact card hands its slot to the CTA

  // ---- name ---------------------------------------------------------------------
  // nameChars is defined above (needed by the letter-slot hints block)
  const front = ((t - (Q + 1.1)) / 0.8) * (nameChars.length + 3) - 1.5;
  const ns = eo5(pr(t, Q + 0.6, Q + 1.15));
  const realName = fillTemplate(text.realNameTemplate, { realName: String(round.realName).replace(/^\(|\)$/g, "") });

  // ---- auto-fit text (long names / hints shrink instead of overflowing) -------------------------------------
  // Cards: text area must stay above the ledge (5 lines at 44px = 230px) and no single word may overflow the card.
  const factRef = useRef(null), nameRef = useRef(null), realRef = useRef(null);
  const cardFits = (el) => el.scrollHeight <= 232 && el.scrollWidth <= el.clientWidth + 1;
  const factSize = useFit(factRef, fontsReady, round.fact, { max: TY.m, min: TY.s, fits: cardFits });
  // Hero name: one line, at most as wide as the progress bar (1440px).
  const nameSize = useFit(nameRef, fontsReady, round.heroName, {
    max: TY.xl, min: 48,
    fits: (el) => Array.from(el.children).reduce((w, c) => w + c.offsetWidth, 0) <= 1440,
  });
  // Real name: measured at its widest moment (letter-spacing .4em at the start of its animation), max 1300px.
  const realSize = useFit(realRef, fontsReady, realName, {
    max: TY.m, min: 24,
    fits: (el) => {
      const sp = el.firstChild;
      sp.style.letterSpacing = "0.4em";
      const ok = sp.offsetWidth <= 1300;
      sp.style.letterSpacing = "";
      return ok;
    },
  });

  // ---- bar ------------------------------------------------------------------------
  let barW, barColor;
  if (preQ) {
    barW = BAR_W * (1 - t / Q);
    barColor = t >= Q - T.urgencySeconds ? colors.red : series;
  } else if (t < Q + 0.3) {
    barW = BAR_W * eo(pr(t, Q, Q + 0.3));
    barColor = colors.mint;
  } else {
    barW = BAR_W * (1 - pr(t, Q + 0.3, endT));
    barColor = colors.mint;
  }
  const urgentBar = preQ && t >= Q - T.urgencySeconds;
  const ticks = Array.from({ length: N - 1 }, (_, k) => Math.round(80 + (BAR_W * (k + 1)) / N));

  // ---- panels (wipe in at start / out at end) -----------------------------------------
  // With settings.variety on, only bonus rounds wipe (in and out); normal clips are hard cuts (panels stay off-screen at -2600).
  const panelX = (k) => {
    if (t < 0.5 && VR.wipeIn) {
      // Legacy hook: the wipe is already in progress on frame 0 (panels start part-way across, so the silhouette crop is visible).
      // The right-hand slab is the navy of the previous clip's wipe-out, so back-to-back clips still join cleanly.
      if (lit && !VR.wipeInFull) return lerp(1250 - k * 150, 1800, eio(pr(t, k * 0.04, k * 0.04 + 0.34)));
      // Bonus round: the screen is fully covered on frame 0, then the two panels sweep away.
      return -600 + eio(pr(t, k * 0.05, k * 0.05 + 0.38)) * 2400;
    }
    if (VR.wipeOut && t > W - 0.1) return -2600 + eio(pr(t, W + k * 0.05, W + 0.38 + k * 0.05)) * 2000;
    return -2600;
  };

  const urgOpacity = preQ ? urg * (0.3 + 0.2 * Math.sin(t * 14)) : 0;
  const flashOpacity = t >= Q ? 0.95 * VR.fx.flash * Math.pow(1 - pr(t, Q, Q + 0.45), 2.2) : 0;

  // PNG mode: same life as the SVG placeholder. The whole hero sways ~±1 deg (feet planted) like the cape does in the SVG.
  const pngSway = `rotate(${(capeAng * 0.55).toFixed(3)}deg)`;
  const pngSwayStyle = { position: "absolute", left: 0, top: 0, width: 386, height: 540, transformOrigin: "50% 92%", transform: pngSway };
  // Mask the extra layers with the hero PNG itself. "contain" + centre mirrors the <img> (object-fit: contain),
  // so the tone and the light sweep can never drift off the silhouette, whatever the PNG's aspect ratio.
  const pngMask = {
    position: "absolute", left: -287, top: 0, width: 960, height: 540,
    WebkitMaskImage: `url(${imgSrc})`, WebkitMaskSize: "contain", WebkitMaskRepeat: "no-repeat", WebkitMaskPosition: "center",
    maskImage: `url(${imgSrc})`, maskSize: "contain", maskRepeat: "no-repeat", maskPosition: "center",
  };

  // ---- visual hint: body-part detail flashes in colour — a double-flash for premium energy ----------
  // Auto-assigns a body part per hero (chest/weapon/hand/eye/leg). Hint ladder (every hint gets its own beat):
  //   flash 1 at 2.0s (the hardest hint) -> letter 1 at 3.5s -> letter 2 at 4.5s (ping + riser) -> flash 2 at 5.4s, HARD rounds only
  // (settings.peek.secondFlashLevels). Each flash has a snappy flicker-on then a smooth ease-out fade. Does NOT hold until reveal.
  const pk = settings.peek || { enabled: false };
  const pkPart = pk.bodyParts ? (round.peekPart || peekPartFor(round.heroName)) : null;
  const pkPartCfg = pkPart && pk.bodyParts ? pk.bodyParts[pkPart] : null;
  const pkX = round.peekX ?? (BT && BT.peekX) ?? (pkPartCfg ? pkPartCfg.x : pk.x) ?? 50;
  const pkY = round.peekY ?? (BT && BT.peekY) ?? (pkPartCfg ? pkPartCfg.y : pk.y) ?? 15;
  const pkR = round.peekR ?? (BT && BT.radius) ?? (pkPartCfg ? pkPartCfg.radius : pk.radius) ?? 52;
  const pkOn = detail || (pk.enabled && !isBonus);
  const pkStart = detail ? 0.3 : (pk.startSeconds ?? H);
  const pkDur = detail ? 999 : (pk.durationSeconds ?? 0.85);
  const pk2Levels = pk.secondFlashLevels; // e.g. ["hard"]: the second flash only plays on those difficulty levels (omit = every round)
  const pk2On = !detail && (!pk2Levels || pk2Levels.includes(diffLevel));
  const pk2At = pk2On ? (pk.secondFlashAt ?? 5.4) : null;
  const pk2Dur = detail ? 0 : (pk.secondFlashDuration ?? 0.7);
  // Single flash envelope: snappy flicker-on (0.18s), hold, smooth ease-out fade (0.3s)
  const flashEnv = (t0, dur) => {
    if (t < t0 || t >= t0 + dur) return 0;
    const pt = t - t0;
    const open = ex(pr(t, t0, t0 + 0.18));               // fast expo-in open
    const flick = pt < (pk.flickerSeconds ?? 0.18) ? (Math.sin(pt * 73) + Math.sin(pt * 41 + 1) > -0.15 ? 1 : 0.25) : 1;
    const pulse = 0.85 + 0.15 * Math.sin(pt * 9);         // gentle breathing pulse
    const fadeOut = 1 - ex(pr(t, t0 + dur - 0.3, t0 + dur)); // smooth expo-out fade
    return open * flick * pulse * cl(fadeOut, 0, 1);
  };
  let pkVis = 0;
  if (pkOn && t >= pkStart) {
    if (detail) {
      // Eye/weapon bonus: hold until reveal (the colour spot IS the puzzle)
      const open = eo(pr(t, pkStart, pkStart + 0.35));
      const pt = t - pkStart;
      const flick = pt < 0.3 ? (Math.sin(pt * 61) + Math.sin(pt * 37 + 1) > -0.2 ? 1 : 0.2) : 1;
      const pulse = pt < 0.3 ? 1 : 0.82 + 0.18 * Math.sin(pt * (6 + pt * 2.4));
      const fadeOut = t < Q ? 1 : 1 - pr(t, Q + 0.2, Q + 0.5);
      pkVis = open * flick * pulse * cl(fadeOut, 0, 1);
    } else {
      // Normal round: double-flash
      const f1 = flashEnv(pkStart, pkDur);
      const f2 = pk2At != null ? flashEnv(pk2At, pk2Dur) : 0;
      pkVis = cl(f1 + f2, 0, 1);
    }
  }
  // Subtle scale breathing: the peek window grows slightly with visibility
  const pkRad = pkR * (0.7 + 0.3 * cl(pkVis * 1.1, 0, 1)) * (preQ ? 1 + 0.5 * pre * 8 : 1);
  const pkGlow = pkRad * (pk.glowRadius || 3.2);
  const pkMaskFor = (cx, cy) =>
    `radial-gradient(circle at ${cx.toFixed(1)}px ${cy.toFixed(1)}px, #000 0, #000 ${(pkRad * 0.55).toFixed(1)}px, transparent ${pkRad.toFixed(1)}px)`;
  const pkLayerStyle = (mask) => ({ WebkitMaskImage: mask, maskImage: mask, WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", opacity: Number(cl(pkVis, 0, 1).toFixed(3)) });

  const silhouetteLayer = usePng ? (
    <div style={{ ...pngSwayStyle, filter: "brightness(0)" }}>
      <div className="hl">
        <Img src={imgSrc} style={{ filter: "brightness(0)" }} />
      </div>
      <div className="hl" style={{ pointerEvents: "none" }}>
        {/* Second pass: solid black masked to the hero alpha, guarantees no color bleeds through
            the first layer's semi-transparent edges. */}
        <div style={{ position: "absolute", left: -287, top: 0, width: 960, height: 540, background: "#000",
          WebkitMaskImage: `url(${imgSrc})`, WebkitMaskSize: "contain", WebkitMaskRepeat: "no-repeat", WebkitMaskPosition: "center",
          maskImage: `url(${imgSrc})`, maskSize: "contain", maskRepeat: "no-repeat", maskPosition: "center" }} />
      </div>
      <div style={pngMask}>
        {/* Pure-black silhouette: no depth gradient, no light sweep — the user wants
            solid black during the silhouette phase, with real colour only at the reveal. */}
      </div>
    </div>
  ) : (
    <div dangerouslySetInnerHTML={{ __html: silhouetteSVG(capeAng, bandSvgX) }} />
  );

  const colourLayer = usePng ? (
    <div style={pngSwayStyle}>
      <div className="hl" style={{ clipPath: `circle(${RrClip.toFixed(1)}px at 50% 36%)` }}>
        <Img src={imgSrc} />
      </div>
    </div>
  ) : (
    <div
      className="hl"
      style={{ clipPath: `circle(${RrClip.toFixed(1)}px at 50% 36%)` }}
      dangerouslySetInnerHTML={{ __html: colourSVG(capeAng) }}
    />
  );

  const colourLayerF = blurRound ? (
    <div style={{ position: "absolute", left: 0, top: 0, width: 386, height: 540, filter: `blur(${focusPx.toFixed(1)}px)` }}>{colourLayer}</div>
  ) : colourLayer;

  const peekLayer = pkVis <= 0.001 ? null : usePng ? (
    <div style={pngSwayStyle}>
      <div style={{ position: "absolute", left: -287, top: 0, width: 960, height: 540, ...pkLayerStyle(pkMaskFor(287 + (pkX / 100) * 386, (pkY / 100) * 540)) }}>
        <Img src={imgSrc} style={{ position: "absolute", left: 0, top: 0, width: 960, height: 540, objectFit: "contain", display: "block" }} />
      </div>
    </div>
  ) : (
    <div className="hl" style={pkLayerStyle(pkMaskFor((pkX / 100) * 386, (pkY / 100) * 540))} dangerouslySetInnerHTML={{ __html: colourSVG(capeAng) }} />
  );
  const peekGlow = pkVis <= 0.001 ? null : (
    <div
      style={{
        position: "absolute", pointerEvents: "none", mixBlendMode: "screen", borderRadius: "50%",
        left: (pkX / 100) * 386 - pkGlow, top: (pkY / 100) * 540 - pkGlow, width: pkGlow * 2, height: pkGlow * 2,
        background: `radial-gradient(circle, rgba(${pk.glowColor},.6) 0, rgba(${pk.glowColor},.22) 30%, rgba(${pk.glowColor},0) 68%)`,
        opacity: Number((0.85 * cl(pkVis, 0, 1)).toFixed(3)),
      }}
    />
  );

  return (
    <AbsoluteFill style={{ background: "#070b1e" }}>
      <style>{buildCss(colors, series, TY)}</style>

      <div id="stage" style={{ transform: `scale(${width / 1600})` }}>
        <CaFilter dx={caAmt * (1 + 0.25 * Math.sin(tr * 300))} dy={caAmt * 0.18} />
        <div id="cam" style={caAmt > 0.25 ? { filter: "url(#qm-ca)" } : undefined}>
          {/* depth layers: background (slowest) -> mid light -> hero + ground -> foreground (fastest) */}
          <div className="ly" style={{ transform: layerTf(D3.bg) }}>
            <div className="bg" style={look ? { background: `radial-gradient(1100px 800px at 50% 40%, ${look.bg[0]} 0%, ${look.bg[1]} 50%, ${look.bg[2]} 100%)` } : undefined} />
            {!animatic && look ? <Motif kind={look.motif} t={t} color={series} opacity={look.motifOpacity} vis={hi * (1 - 0.5 * rev)} /> : null}
            {!animatic ? <BgMotes t={t} vis={hi} /> : null}
          </div>
          <div className="ly" style={{ transform: layerTf(D3.mid) }}>
            <div className="cone" style={{ opacity: coneOpacity, transform: `rotate(${coneRot.toFixed(2)}deg)` }} />
            <div className="blc" style={{ opacity: blcOpacity }} />
            <div id="disc" style={{ opacity: Number(discOpacity.toFixed(3)), transform: `scale(${discScale.toFixed(3)})` }} />
            <div className="blw" style={{ opacity: Number(blwOpacity.toFixed(3)), background: `radial-gradient(circle, rgba(${gl},.6), rgba(${gl},0) 62%)` }} />
            {D3.dust && !animatic ? <DustCone t={t} vis={coneOpacity} warm={cl(rev * 1.4, 0, 1)} tint={mixRgb(heroRgb, [255, 255, 255], 0.35)} /> : null}
          </div>
          <div className="ly" style={{ transform: layerTf(D3.hero) }}>
            <div id="ledge" />
            <div id="floor" style={{ opacity: hi }} />
            {/* contact shadow: tightens during the anticipation, spreads on the hit */}
            <div style={{ left: 800 - 190 + fakeDx, top: 652, width: 380, height: 46, borderRadius: "50%", opacity: Number((0.9 * hi).toFixed(3)), transform: `scaleX(${shadowScale.toFixed(3)})`,
              background: "radial-gradient(closest-side, rgba(0,0,0,.85), rgba(0,0,0,.35) 60%, rgba(0,0,0,0))" }} />
            {RV.rays && VR.fx.rays && !animatic ? <Rays p={t >= Q ? (t - Q) / 1.1 : 0} cx={rcx} cy={130 + 540 * 0.36} hot={hotC} /> : null}
            {fake ? (
              <>
                <div style={{ left: 800 - 190 - fakeDx, top: 652, width: 380, height: 46, borderRadius: "50%", opacity: Number((0.9 * hi).toFixed(3)),
                  background: "radial-gradient(closest-side, rgba(0,0,0,.85), rgba(0,0,0,.35) 60%, rgba(0,0,0,0))" }} />
                <div style={{ left: 607, top: 130, width: 386, height: 540, transformOrigin: "50% 100%",
                  opacity: Number((hi * (1 - 0.6 * pr(t, Q + 0.2, Q + 0.7))).toFixed(3)),
                  transform: `translate(${(-fakeDx).toFixed(2)}px, ${((1 - heroIn) * 14 + br * 4).toFixed(2)}px) scale(${(1.14 * fakeSc * (1 + 0.01 * br)).toFixed(4)})`,
                  filter: `drop-shadow(0 0 22px rgba(170,195,255,.9))` }}>
                  <div style={{ position: "absolute", left: 0, top: 0, width: 386, height: 540, transform: round.hasDecoy ? undefined : "scaleX(-1)" }}>
                    {decoySrc ? (
                      <>
                        <div className="hl"><div style={{ position: "absolute", left: -287, top: 0, width: 960, height: 540, background: "#000", WebkitMaskImage: `url(${decoySrc})`, WebkitMaskSize: "contain", WebkitMaskRepeat: "no-repeat", WebkitMaskPosition: "center", maskImage: `url(${decoySrc})`, maskSize: "contain", maskRepeat: "no-repeat", maskPosition: "center" }} /></div>
                        <div className="hl" style={{ opacity: pr(t, Q, Q + 0.4) * 0.85 }}><Img src={decoySrc} /></div>
                      </>
                    ) : (
                      <>
                        <div dangerouslySetInnerHTML={{ __html: silhouetteSVG(-capeAng, -140) }} />
                        <div className="hl" style={{ opacity: pr(t, Q, Q + 0.4) * 0.85 }} dangerouslySetInnerHTML={{ __html: colourSVG(-capeAng) }} />
                      </>
                    )}
                  </div>
                </div>
                {[-210, 210].map((dx) => {
                  const isReal = dx < 0 === realLeft;
                  const bp = spring(pr(t, Q + 0.15, Q + 0.75));
                  return (
                    <div key={dx} style={{ left: 800 + dx - 100, top: 106, width: 200, display: "flex", justifyContent: "center", opacity: lit ? 1 : hi }}>
                      {t < Q + 0.15 ? (
                        <div style={{ width: 80, height: 80, borderRadius: "50%", border: `4px solid ${series}`, background: "rgba(11,18,48,.8)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                          fontFamily: "var(--display)", fontWeight: 900, fontSize: TY.l, lineHeight: 1 }}>{dx < 0 ? "A" : "B"}</div>
                      ) : (
                        <div style={{ transform: `scale(${(0.4 + 0.6 * bp).toFixed(3)})`, padding: "8px 22px", borderRadius: 40, whiteSpace: "nowrap", fontFamily: "var(--display)", fontWeight: 900, fontSize: TY.s, letterSpacing: ".1em", lineHeight: 1.1,
                          background: isReal ? colors.mint : "rgba(11,18,48,.85)", color: isReal ? colors.navy : "#fff", border: isReal ? "3px solid " + colors.mint : "3px solid " + colors.red }}>
                          {isReal ? "\u2713 REAL" : "\u2715 FAKE"}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            ) : null}
            {half ? (
              <div style={{ left: 799, top: 100, width: 3, height: 600, opacity: Number((0.8 * (1 - pr(t, Q, Q + 0.3))).toFixed(3)),
                background: `linear-gradient(180deg, rgba(${gl},0), rgba(${gl},.95) 50%, rgba(${gl},0))`, boxShadow: `0 0 18px 4px rgba(${gl},.5)` }} />
            ) : null}
            <div id="hero" style={{ opacity: lit ? 1 : hi, transform: heroTransform, filter: heroFilter, clipPath: halfClip }}>
              {/* floor reflection: mirrored copy under the feet, fading out; it follows the hero's sway/pop and the colour reveal */}
              <div style={{ position: "absolute", left: 0, top: 540, width: 386, height: 540, transform: "scaleY(-1)", opacity: Number((0.5 * hi).toFixed(3)), filter: "blur(1.6px)", pointerEvents: "none",
                WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,.7) 0, rgba(0,0,0,0) 34%)", maskImage: "linear-gradient(to top, rgba(0,0,0,.7) 0, rgba(0,0,0,0) 34%)" }}>
                {blurRound ? null : silhouetteLayer}
                {colourLayerF}
              </div>
              {blurRound ? null : silhouetteLayer}
              {peekLayer}
              {colourLayerF}
              {peekGlow}
              <div
                id="rv"
                style={{
                  width: Rr * 2,
                  height: Rr * 2,
                  marginLeft: -Rr,
                  marginTop: -Rr,
                  opacity: rvOpacity,
                  boxShadow: `0 0 40px 8px rgba(${gl},.7)`,
                }}
              />
            </div>
            <div className="sh" style={shock[0]} />
            <div className="sh" style={shock[1]} />
          </div>
          <div className="ly" style={{ transform: layerTf(D3.fg) }}>
            {D3.foreground && !animatic ? <FgMotes t={t} vis={hi * (1 - 0.5 * rev)} /> : null}
            {D3.burst && !animatic ? <Burst t={t} t0={Q} cx={rcx} cy={130 + 540 * 0.36} rgb={heroStr} hot={hotC} mid={midC} /> : null}
          </div>
        </div>

        {RV.flare && VR.fx.flare && !animatic ? <LensFlare t={t} t0={Q} cx={rcx} cy={130 + 540 * 0.36} rgb={heroStr} hot={hotC} /> : null}
        {look && look.grade && !animatic ? <div style={{ inset: 0, pointerEvents: "none", background: look.grade.color, mixBlendMode: look.grade.blend || "soft-light", opacity: look.grade.opacity }} /> : null}
        <div className="vig" />
        {/* Dither grain: 256px tile shown 1:1 in output pixels (160 design px x 1.6). Hides 8-bit gradient banding. */}
        {!animatic ? <div className="grain" style={{ backgroundImage: `url(${staticFile("fx/grain.png")})`, backgroundSize: `${(256 * 1600) / width}px ${(256 * 1600) / width}px` }} /> : null}
        <div id="urg" style={{ opacity: Number(urgOpacity.toFixed(3)) }} />

        <div id="wm" style={{
          opacity: 0.7 * wmE,
          transform: `translateY(${((1 - wmE) * -16).toFixed(1)}px) scale(${lerp(0.92, 1, wmE).toFixed(3)})`,
        }}>
          <div style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "9px 22px 9px 13px",
            borderRadius: 27,
            background: "rgba(14,8,60,.42)",
            border: "2px solid rgba(255,255,255,.4)",
            backdropFilter: "blur(3px)",
            WebkitBackdropFilter: "blur(3px)",
            overflow: "hidden",
          }}>
            {/* glint sweep */}
            <div style={{
              position: "absolute",
              inset: 0,
              overflow: "hidden",
              borderRadius: 27,
              pointerEvents: "none",
            }}>
              <div style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(105deg, transparent 38%, rgba(255,255,255,.6) 50%, transparent 62%)",
                transform: `translateX(${lerp(-130, 130, wmGlint).toFixed(1)}%)`,
              }} />
            </div>
            <Img
              src={staticFile("images/logo.svg")}
              style={{
                height: 58,
                width: "auto",
                display: "block",
                filter: `drop-shadow(0 0 ${lerp(5, 15, wmBreathe).toFixed(1)}px rgba(255,200,60,${lerp(0.5, 1, wmBreathe).toFixed(2)}))`,
              }}
            />
            <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.15, whiteSpace: "nowrap" }}>
              <b>{wmFirst}</b>
              {wmLast && wmFirst !== wmLast ? <i>{wmLast}</i> : null}
            </span>
          </div>
        </div>

        {PG.enabled ? (
          <div id="trk" style={{ opacity: trkE, transform: `translateX(${(-30 * (1 - trkE)).toFixed(1)}px)` }}>
            <div className="row">
              {isBonus ? (
                <>
                  <b style={{ color: preQ ? undefined : colors.mint }}>{text.bonusLabel || "BONUS"}</b>
                  <span>{round.bonusNo} / {round.bonusTotal}</span>
                </>
              ) : (
                <>
                  <b style={{ color: preQ ? undefined : colors.mint }}>{round.id}</b>
                  <span>/</span>
                  <span>{total}</span>
                </>
              )}
            </div>
            <div className="bar"><i style={{ width: `${(100 * Math.min(1, isBonus ? round.bonusNo / round.bonusTotal : round.id / total)).toFixed(1)}%`, background: preQ ? undefined : colors.mint }} /></div>
          </div>
        ) : null}

        {diffShow ? (
          <div id="lvl" style={{
            opacity: Number((diffE * 0.78).toFixed(3)),
            transform: `translateX(${(-30 * (1 - diffE)).toFixed(1)}px)`,
            background: `rgba(${diffColor ? hexToRgb(diffColor).join(",") : "255,255,255"},.08)`,
            border: `1px solid rgba(${diffColor ? hexToRgb(diffColor).join(",") : "255,255,255"},.32)`,
            color: diffColor || "#fff",
            boxShadow: diffFlame ? `0 0 10px rgba(${diffColor ? hexToRgb(diffColor).join(",") : "255,107,107"},.18)` : "none",
          }}>
            {diffFlame ? (
              <svg className="flame" width="14" height="17" viewBox="0 0 24 30" fill="currentColor" aria-hidden="true">
                <path d="M12 0 C 13.5 5, 18 7.5, 18 14 C 18 18.5, 15.5 22, 12 22 C 8.5 22, 6 18.5, 6 14 C 6 11, 8 9.5, 9 8 C 10.5 10, 11.5 9, 12 6 C 12.5 3, 11 2, 12 0 Z M 11 19 C 11 21, 13 21, 13 19 C 13 17.5, 11 17.5, 11 19 Z" />
              </svg>
            ) : null}
            <span>{diffLabel}</span>
          </div>
        ) : null}

        <div
          id="pr"
          style={{
            opacity: Number((qIn * (1 - qOut)).toFixed(3)),
            clipPath: `inset(0 0 0 ${((1 - qIn) * 100).toFixed(1)}%)`,
            transform: `translateX(${((1 - qIn) * 60 + qOut * 30).toFixed(1)}px)`,
          }}
        >
          <small>{isBonus ? BT.label : text.promptLabel || "QUESTION"}</small>
          <div className="ln" style={{ fontSize: promptFont }}>
            {words.map((w, i) => {
              const ein = lit ? ex(pr(t, 0.15 + i * 0.09, 0.6 + i * 0.09)) : ex(pr(t, 0.65 + i * 0.1, 1.2 + i * 0.1));
              const eout = eio(pr(t, Q - 0.15 + i * 0.04, Q + 0.12 + i * 0.04));
              return (
                <span className="w" key={i}>
                  <span
                    className={`wi${i === words.length - 1 ? " q" : ""}`}
                    style={{ transform: `translateY(${((1 - ein) * 115 - eout * 115).toFixed(1)}%)` }}
                  >
                    {w}
                  </span>
                </span>
              );
            })}
          </div>
        </div>

        {slotsOn && slots.length ? (
          <div
            id="lh"
            style={{
              gap: LH.gap,
              // The tile row stays on screen through the reveal and to the end of the clip.
              opacity: 1,
              height: LH.tileH,
              transform: `scale(${slotScale.toFixed(4)})`,
            }}
          >
            {slots.map((s, i) => {
              // --- row entry (unchanged) ---
              const e    = ex(pr(t, LH.showAtSeconds + i * 0.04, LH.showAtSeconds + 0.5 + i * 0.04));
              const rise = `translateY(${((1 - e) * 34).toFixed(1)}px)`;

              // non-letter chars (space, hyphen, etc.) stay on screen for the whole clip
              if (!s.letter) {
                if (s.ch === " ") return <div key={i} className="fixed" style={{ width: LH.spaceW, height: LH.tileH, opacity: Number(e.toFixed(3)), transform: rise }} />;
                const bar = s.ch === "-" || s.ch === "–" || s.ch === "—";
                return (
                  <div key={i} className="fixed" style={{ width: LH.fixedW, height: LH.tileH, opacity: Number(e.toFixed(3)), transform: rise }}>
                    {bar ? <i style={{ display: "block", width: 30, height: 8, borderRadius: 4, background: "rgba(255,255,255,.6)" }} /> : s.ch}
                  </div>
                );
              }

              // ---- letter tile: empty until its fill time (hint time or reveal cascade), then pops and stays filled ----
              const u = t - slotFillT[i];
              const on = u >= 0;
              const pop    = on ? spring(pr(u, 0, 0.7)) : 0;
              const settle = on ? 1 - pr(u, 0, 0.9) : 0;
              const flash  = on ? Math.pow(1 - pr(u, 0, 0.4), 2) : 0;
              const ring   = on ? pr(u, 0, 0.65) : 1;
              const glint  = on ? pr(u, 0.08, 0.62) : 0;
              const breathe = 0.5 + 0.5 * Math.sin(t * 2.4 + i * 0.7);

              return (
                <div
                  key={i}
                  className="tile"
                  style={{
                    width: LH.tileW,
                    height: LH.tileH,
                    opacity: Number(e.toFixed(3)),
                    transform: `${rise} scale(${(on ? 0.55 + 0.45 * pop : 1).toFixed(4)})`,
                    borderRadius: 14,
                    boxShadow: on
                      ? `0 0 ${(16 + 18 * settle).toFixed(1)}px color-mix(in srgb, ${series} 75%, transparent), 0 8px 18px rgba(0,0,0,.35)`
                      : "0 8px 18px rgba(0,0,0,.35)",
                  }}
                >
                  <div
                    className="face"
                    style={{
                      background: on
                        ? `linear-gradient(180deg, color-mix(in srgb, ${series} 60%, #fff) 0%, ${series} 100%)`
                        : "linear-gradient(180deg, rgba(255,255,255,.13), rgba(255,255,255,.035))",
                      border: on ? `1.5px solid color-mix(in srgb, ${series} 35%, #fff)` : "1.5px solid rgba(255,255,255,.24)",
                      boxShadow: on ? "inset 0 1px 0 rgba(255,255,255,.55)" : "inset 0 1px 0 rgba(255,255,255,.18)",
                    }}
                  >
                    {on ? (
                      <>
                        <b style={{ color: colors.navy, transform: GLYPH[s.ch] ? `scaleX(${Math.min(1, (LH.tileW - 14) / (GLYPH[s.ch] * TY.xl)).toFixed(3)})` : undefined }}>{s.ch}</b>
                        <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: Number((0.9 * flash).toFixed(3)) }} />
                        {glint > 0 && glint < 1 ? (
                          <div style={{
                            position: "absolute", top: -10, bottom: -10, left: 0, width: 36,
                            background: "linear-gradient(105deg, rgba(255,255,255,0), rgba(255,255,255,.75), rgba(255,255,255,0))",
                            transform: `translateX(${lerp(-44, LH.tileW + 8, glint).toFixed(1)}px)`,
                          }} />
                        ) : null}
                      </>
                    ) : (
                      <div style={{
                        position: "absolute", left: "18%", bottom: Math.round(LH.tileH * 0.2), width: "64%", height: 6, borderRadius: 3,
                        background: `rgba(255,255,255,${(0.34 + 0.24 * breathe).toFixed(3)})`,
                      }} />
                    )}
                  </div>

                  {/* pop ring when a tile fills in */}
                  {on && ring < 1 ? (
                    <div style={{
                      position: "absolute", inset: -3, borderRadius: 17, pointerEvents: "none",
                      border: `3px solid ${series}`,
                      opacity: Number((0.7 * (1 - ring)).toFixed(3)),
                      transform: `scale(${(1 + 0.8 * eo(ring)).toFixed(3)})`,
                    }} />
                  ) : null}

                </div>
              );
            })}
          </div>
        ) : null}

        <div id="ring" style={{ opacity: rc, transform: `translateX(${(-90 * (1 - rc)).toFixed(1)}px)` }}>
          <div id="ringbox">
            <svg id="rsvg" width="180" height="180" viewBox="0 0 180 180" aria-hidden="true">
              {Array.from({ length: N }, (_, k) => (
                <circle
                  key={`tr${k}`}
                  cx="90"
                  cy="90"
                  r={R0}
                  fill="none"
                  stroke="rgba(255,255,255,.14)"
                  strokeWidth="12"
                  transform={`rotate(${-90 + (k * 360) / N + GAP / 2} 90 90)`}
                  strokeDasharray={`${SEG_LEN.toFixed(2)} ${C.toFixed(2)}`}
                />
              ))}
              {Array.from({ length: N }, (_, k) => {
                const f = preQ ? 1 - cl(t - k, 0, 1) : 1;
                const len = SEG_LEN * f;
                const urgent = preQ && k >= N - T.redSeconds; // non-colour cue: the last segments are drawn thicker, not only red
                return (
                  <circle
                    key={`sg${k}`}
                    cx="90"
                    cy="90"
                    r={R0}
                    fill="none"
                    stroke={segColor(k)}
                    strokeWidth={urgent ? 17 : 12}
                    transform={`rotate(${-90 + (k * 360) / N + GAP / 2} 90 90)`}
                    strokeDasharray={`${len.toFixed(2)} ${C.toFixed(2)}`}
                    strokeDashoffset={(-(SEG_LEN - len)).toFixed(2)}
                  />
                );
              })}
            </svg>
            <div id="rip" style={{ opacity: ripOpacity, transform: `scale(${ripScale.toFixed(3)})`, borderColor: ripColor }} />
            <div id="num" style={{ fontSize: numSize, transform: `scale(${numScale[0].toFixed(3)}, ${numScale[1].toFixed(3)})`, transformOrigin: "50% 60%", color: numColor }}>
              {numText}
            </div>
          </div>
          <div id="ringlbl">{ringLabel}</div>
        </div>

        <div
          className="card"
          id="fact"
          style={{
            opacity: fn * (1 - factOut),
            clipPath: `inset(0 0 0 ${((1 - fn) * 100).toFixed(1)}%)`,
            transform: `translateX(${((1 - fs) * 60 + factOut * 30).toFixed(1)}px)`,
          }}
        >
          <small>{text.factLabel}</small>
          <p ref={factRef} style={{ fontSize: factSize }}>{round.fact}</p>
        </div>

        {isCta && cn > 0 ? (
          <div
            id="cta"
            style={{
              opacity: cn,
              clipPath: `inset(0 0 0 ${((1 - cn) * 100).toFixed(1)}%)`,
              transform: `translateX(${((1 - cs) * 60).toFixed(1)}px) scale(${(1 + 0.015 * Math.sin((t - ctaT) * 8)).toFixed(4)})`,
            }}
          >
            <b>{CT.text}</b>
            <small>{CT.sub}</small>
          </div>
        ) : null}

        {animatic ? (
          <div id="dbg">
            {`${tr.toFixed(2)}s  f${frame}\n${tr < 0.5 ? "WIPE IN" : tr < H ? "QUESTION" : tr < Q ? "HINT + COUNTDOWN" : tr < ctaT ? "REVEAL" : tr < W || !VR.wipeOut ? (isCta ? "CTA" : "FACT") : "WIPE OUT"}`}
          </div>
        ) : null}

        <div id="nm">
          <div id="nmain" ref={nameRef} style={{ fontSize: nameSize }}>
            {nameChars.map((ch, i) => {
              // When letter boxes are on, the name is shown inside the boxes and this plain text stays hidden.
              const pl = pr(t, Q + 0.15 + i * 0.05, Q + 0.15 + i * 0.05 + 0.45);
              const opacity = boxesOn ? 0 : Number(eo(cl(pl * 2, 0, 1)).toFixed(3));
              const e = eb(pl);
              const translateY = (1 - e) * 50;
              const shn = Math.max(0, 1 - Math.abs(i - front) / 1.5);
              return (
                <span
                  key={i}
                  style={{
                    opacity,
                    transform: `translateY(${translateY.toFixed(1)}px)`,
                    color: `rgb(255,${Math.round(255 - 30 * shn)},${Math.round(255 - 110 * shn)})`,
                  }}
                >
                  {ch === " " ? "\u00A0" : ch}
                </span>
              );
            })}
          </div>
          <div id="nsubw">
            <div
              id="nsub"
              ref={realRef}
              style={{
                fontSize: realSize,
                transform: `translateY(${((1 - ns) * 110).toFixed(1)}%)`,
                letterSpacing: `${lerp(0.4, 0.22, ns).toFixed(3)}em`,
              }}
            >
              <span style={{ display: "inline-block" }}>{realName}</span>
            </div>
          </div>
        </div>

        <div id="track" style={{ clipPath: `inset(0 ${((1 - barIn) * 100).toFixed(1)}% 0 0)` }} />
        <div id="fill" style={{ width: f1(barW), background: barColor, top: urgentBar ? 865 : 868, height: urgentBar ? 16 : 10, clipPath: `inset(0 ${((1 - barIn) * 100).toFixed(1)}% 0 0)` }} />
        {ticks.map((x) => (
          <div className="tk" key={x} style={{ left: x, opacity: preQ ? 0.9 * barIn : 0 }} />
        ))}

        <div id="flash" style={{ opacity: Number(flashOpacity.toFixed(3)) }} />
        <div className="pn" style={{ background: series, transform: `translateX(${panelX(0).toFixed(1)}px) skewX(-12deg)` }} />
        <div className="pn" style={{ background: colors.navy2, transform: `translateX(${panelX(1).toFixed(1)}px) skewX(-12deg)` }} />
      </div>
    </AbsoluteFill>
  );
};

// Audio lives outside the motion-blur wrapper (the blur renders its children several times; the soundtrack must play once).
// The scene is only wrapped in <CameraMotionBlur> inside the fast-move windows (see timing.js); pass motionBlur={false} to skip it entirely.
export const Round = ({ roundId, motionBlur, hookVariant, animatic }) => {
  const frame = useCurrentFrame();
  const t = frame / T.fps;
  const mb = settings.motionBlur || { mode: "off" };
  // Motion blur is Omit during the Studio preview: the plus-lighter sample stacking
  // overwhelms the browser compositor and makes the whole page blink. It stays on
  // for real renders: scripts/render-batches.js passes motionBlur:true.
  const mode = motionBlur === false || animatic ? "off" : motionBlur === true ? "windows" : mb.mode;
  const round = findRound(rounds, roundId);
  const VR = round ? varietyOf(round) : null;
  // the wipe-out blur window (last entry) is skipped on clips that end in a plain cut
  const wins = VR && !VR.wipeOut ? T.blurWindows.slice(0, -1) : T.blurWindows;
  const blur = mode === "always" || (mode === "windows" && wins.some(([a, b]) => t >= a && t < b));
  const scene = <Scene roundId={roundId} hookVariant={hookVariant} animatic={animatic} />;
  return (
    <AbsoluteFill style={{ background: "#070b1e" }}>
      {/* One finished, mastered stereo soundtrack per round (scripts/generate-mix.js -> public/sounds/rounds/<id>.wav) */}
      <Audio src={staticFile(`sounds/rounds/${round ? round.id : roundId}.wav`)} volume={settings.mix.volume} />
      {blur ? (
        <CameraMotionBlur shutterAngle={mb.shutterAngle} samples={mb.samples}>
          {scene}
        </CameraMotionBlur>
      ) : (
        scene
      )}
    </AbsoluteFill>
  );
};
