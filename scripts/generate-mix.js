#!/usr/bin/env node
// Builds ONE finished, mastered stereo soundtrack per round: public/sounds/rounds/<id>.wav (11.8 s, 44.1 kHz, 16-bit).
//
// What the mix does (all tunable in settings.json -> "mix"):
//   - Pre-reveal duck: everything except the reveal FX drops to near-silence `duckLeadMs` (150 ms) before the reveal, so the impact lands out of a hole.
//   - Last 3 s: the plain ticks are replaced by an accelerating low heartbeat (lub-dub) that speeds up into the duck.
//   - Whooshes are panned left -> right in sync with the wipe panels (wipe-in at 0 s, wipe-out at the end).
//   - Chime (and a touch of the impact) go through a stereo reverb.
//   - Per-round variation: pitch of every sound (and the key of the pad) is shifted by a few cents/semitones, seeded by the round id,
//     plus small timing / level jitter, so 50-75 clips in a row don't wear out.
//   - Music bed: quiet detuned-saw pad with a low-pass filter sweep that opens through the question phase; it is side-chain ducked under every effect.
//   - Master: integrated loudness -> -14 LUFS (ITU-R BS.1770-4, gated), look-ahead limiter, true peak <= -1.5 dBTP
//     (a bit under the -1 dB brief, leaving room for the AAC encode).
//
// Deterministic: same round id + same settings = same file. Results are cached (hash of script + settings + id).
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { P, readSourceRounds, flag } = require("./lib");
const { varietyFor } = require("../src/variation"); // shared with the picture: which clips wipe, which reveals are calm
let roundsCount = 0;
const varOf = (r) => varietyFor(r, settings, r.total ?? (settings.progress && settings.progress.total) ?? roundsCount);

const SR = 44100;
const settings = JSON.parse(fs.readFileSync(P.settings, "utf8"));
const M = settings.mix;
const Q = settings.questionSeconds, H = settings.hintAtSeconds;
const W = Q + settings.revealSeconds, D = W + settings.wipeSeconds;
const N = Math.round(D * SR);
const outDir = path.join(P.root, "public", "sounds", "rounds");
fs.mkdirSync(outDir, { recursive: true });

// ---------- tiny deterministic RNGs ----------
function lcg(seed) { let s = (seed >>> 0) || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const hashSeed = (id) => (Math.imul(Number(id) + 7919, 2654435761) ^ 0x9e3779b9) >>> 0;
const expInterp = (a, b, x) => a * Math.pow(b / a, Math.min(1, Math.max(0, x)));
const dB = (x) => Math.pow(10, x / 20);
const lerp = (a, b, x) => a + (b - a) * Math.min(1, Math.max(0, x));

// ---------- synthesis primitives (same recipes as generate-sounds.js, but with a pitch ratio) ----------
function waveBL(type, phase, f) {
  if (type === "sine") return Math.sin(phase);
  if (type === "triangle") return (2 / Math.PI) * Math.asin(Math.sin(phase));
  let s = 0;
  const maxK = Math.floor(20000 / f);
  if (type === "square") for (let k = 1; k <= maxK; k += 2) s += Math.sin(k * phase) / k;
  else for (let k = 1; k <= maxK; k++) s += ((k % 2 ? 1 : -1) * Math.sin(k * phase)) / k;
  return type === "square" ? (4 / Math.PI) * s : (2 / Math.PI) * s;
}
function gainAt(t, attackEnd, vol, end) {
  if (t < 0) return 0;
  if (t < attackEnd) return expInterp(0.0001, vol, t / attackEnd);
  if (t < end) return expInterp(vol, 0.0001, (t - attackEnd) / (end - attackEnd));
  return 0.0001;
}
const buf = (sec) => new Float32Array(Math.ceil(sec * SR));
function tone(out, f, when, dur, type, vol) {
  const n0 = Math.floor(when * SR), n = Math.floor((dur + 0.03) * SR);
  for (let i = 0; i < n && n0 + i < out.length; i++) {
    const t = i / SR;
    out[n0 + i] += waveBL(type, 2 * Math.PI * f * t, f) * gainAt(t, 0.01, vol, dur);
  }
}
function glide(out, f0, f1, dur, type, vol, swell) {
  const n = Math.floor((dur + 0.08) * SR);
  let phase = 0;
  for (let i = 0; i < n && i < out.length; i++) {
    const t = i / SR;
    const f = t < dur ? expInterp(f0, f1, t / dur) : f1;
    phase += (2 * Math.PI * f) / SR;
    out[i] += waveBL(type, phase, f) * gainAt(t, swell ? dur * 0.9 : 0.02, vol, dur + 0.04);
  }
}
function sweep(out, f0, f1, dur, vol, rnd) {
  const n = Math.floor(dur * SR), Qf = 1.4;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < n && i < out.length; i++) {
    const t = i / SR, f = expInterp(f0, f1, t / dur);
    const w0 = (2 * Math.PI * f) / SR, alpha = Math.sin(w0) / (2 * Qf), a0 = 1 + alpha;
    const b0 = alpha / a0, b2 = -alpha / a0, a1 = (-2 * Math.cos(w0)) / a0, a2 = (1 - alpha) / a0;
    const x0 = rnd() * 2 - 1;
    const y0 = b0 * x0 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x0; y2 = y1; y1 = y0;
    out[i] += y0 * gainAt(t, dur * 0.35, vol, dur);
  }
}
function normalise(b, peak) {
  let m = 0;
  for (let i = 0; i < b.length; i++) m = Math.max(m, Math.abs(b[i]));
  if (m > 0) for (let i = 0; i < b.length; i++) b[i] *= peak / m;
  return b;
}

// ---------- stereo mix buses ----------
const mkBus = () => ({ L: new Float32Array(N), R: new Float32Array(N) });
// pan: number -1..1, or function(tSecondsSinceStart) -> -1..1 (equal-power)
function addMono(bus, mono, when, gain, pan = 0) {
  const n0 = Math.round(when * SR);
  for (let i = 0; i < mono.length; i++) {
    const idx = n0 + i;
    if (idx < 0 || idx >= N) continue;
    const p = typeof pan === "function" ? pan(i / SR) : pan;
    const a = (p + 1) * Math.PI / 4;
    const v = mono[i] * gain;
    bus.L[idx] += v * Math.cos(a);
    bus.R[idx] += v * Math.sin(a);
  }
}

// Freeverb-style stereo reverb (8 combs + 4 allpasses per side), with pre-delay.
function reverb(sendMono, { room = 0.86, damp = 0.35, pre = 0.018, width = 1 } = {}) {
  const combT = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], apT = [556, 441, 341, 225], spread = 23;
  const mkSide = (off) => ({
    combs: combT.map((t) => ({ b: new Float32Array(t + off), i: 0, s: 0 })),
    aps: apT.map((t) => ({ b: new Float32Array(t + off), i: 0 })),
  });
  const sides = [mkSide(0), mkSide(spread)];
  const out = [new Float32Array(sendMono.length), new Float32Array(sendMono.length)];
  const pd = Math.round(pre * SR);
  for (let c = 0; c < 2; c++) {
    const side = sides[c];
    for (let n = 0; n < sendMono.length; n++) {
      const x = (n - pd >= 0 ? sendMono[n - pd] : 0) * 0.03;
      let y = 0;
      for (const k of side.combs) {
        const o = k.b[k.i];
        k.s = o * (1 - damp) + k.s * damp;
        k.b[k.i] = x + k.s * room;
        if (++k.i >= k.b.length) k.i = 0;
        y += o;
      }
      for (const a of side.aps) {
        const bo = a.b[a.i];
        const o = -y + bo;
        a.b[a.i] = y + bo * 0.5;
        if (++a.i >= a.b.length) a.i = 0;
        y = o;
      }
      out[c][n] = y;
    }
  }
  // width: blend toward mono
  const mid = out[0].map((v, i) => (v + out[1][i]) / 2);
  for (let i = 0; i < mid.length; i++) {
    out[0][i] = mid[i] + (out[0][i] - mid[i]) * width;
    out[1][i] = mid[i] + (out[1][i] - mid[i]) * width;
  }
  return out;
}

// polyBLEP saw (band-limited enough once low-passed), phase in [0,1)
function polyBlep(t, dt) {
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
}

// ---------- the per-round build ----------
function buildRound(round) {
  const VR = varOf(round);
  const rnd = lcg(hashSeed(round.id));
  const r01 = () => rnd();
  const rs = (a) => (r01() * 2 - 1) * a; // symmetric random in [-a, a]
  // Round-wide key shift (semitones) + per-sound jitter (semitones) + small cent-level noise.
  const key = rs(M.pitchSemitones);
  const ratio = (jit = M.pitchJitterSemitones) => Math.pow(2, (key + rs(jit)) / 12);
  const lvl = (db = M.levelJitterDb) => dB(rs(db));
  const tj = () => rs(M.timingJitterMs) / 1000;

  const pre = mkBus();   // everything subject to the pre-reveal duck + music sidechain target
  const fx = mkBus();    // reveal / wipe FX (never pre-ducked)
  const fxSend = new Float32Array(N); // reverb send
  const sideKey = new Float32Array(N); // effect bus for the side-chain follower (mono)
  const L = M.levels;

  const feedKey = (mono, when, gain) => { // add a sound's energy to the side-chain key
    const n0 = Math.round(when * SR);
    for (let i = 0; i < mono.length && n0 + i < N; i++) if (n0 + i >= 0) sideKey[n0 + i] = Math.max(sideKey[n0 + i], Math.abs(mono[i]) * gain);
  };

  // --- plain ticks for the first seconds (replaced by the heartbeat in the last `heartbeatSeconds`) ---
  const hbStart = Q - M.heartbeatSeconds;
  const nTicks = Math.round(hbStart);
  for (let k = 0; k < nTicks; k++) {
    const b = buf(0.1);
    tone(b, 1500 * ratio(), 0, 0.05, "square", 0.05);
    normalise(b, 0.3);
    addMono(pre, b, k + (k ? tj() : 0), L.tick * lvl(), rs(0.12));
  }

  // --- heartbeat: lub-dub that accelerates until the duck ---
  {
    const hbEnd = Q - M.duckLeadMs / 1000 - 0.28; // last lub, so the dub finishes before the duck starts
    const base = ratio(0.4);
    const thump = (f0, f1, dur, drive) => {
      const b = buf(dur + 0.12);
      let ph = 0;
      for (let i = 0; i < b.length; i++) {
        const t = i / SR;
        const f = expInterp(f0, f1, t / dur);
        ph += (2 * Math.PI * f) / SR;
        const env = Math.min(1, t / 0.004) * Math.exp(-t / (dur * 0.42));
        // sine + soft saturation: adds 2nd/3rd harmonics so it reads on phone speakers, not just subs
        b[i] = Math.tanh(drive * Math.sin(ph) * env) + 0.25 * Math.sin(2 * ph) * env;
      }
      return normalise(b, 1);
    };
    let t = hbStart;
    const period0 = M.heartbeatStartPeriod * (1 + rs(0.04)), period1 = M.heartbeatEndPeriod * (1 + rs(0.04));
    let beat = 0;
    while (t <= hbEnd) {
      const x = (t - hbStart) / (hbEnd - hbStart);
      const per = lerp(period0, period1, Math.pow(x, 1.1));
      const gain = lerp(0.55, 1.0, Math.pow(x, 0.8)) * lvl(0.5);
      const lub = thump(105 * base, 46 * base, 0.16, 2.2);
      const dub = thump(130 * base, 52 * base, 0.12, 1.8);
      addMono(pre, lub, t, L.heartbeat * gain, 0);
      addMono(pre, dub, t + per * 0.2 + 0.05, L.heartbeat * gain * 0.62, 0);
      t += per;
      beat++;
    }
  }

  // --- first letter hint: a softer, lower ping (uses no random draws, so every other seeded sound in the round is unchanged) ---
  if (settings.letterHints && settings.letterHints.enabled) {
    const H1 = settings.letterHints.hint1AtSeconds ?? 3;
    const b = buf(0.35);
    tone(b, 784 * Math.pow(2, key / 12), 0, 0.24, "sine", 0.12);
    normalise(b, 0.3);
    addMono(pre, b, H1, L.ping * 0.7, 0.1);
    feedKey(b, H1, 0.6);
  }

  // --- second letter hint: ping + riser (hint -> reveal) ---
  {
    const b = buf(0.35);
    tone(b, 1046 * ratio(), 0, 0.28, "sine", 0.12);
    normalise(b, 0.38);
    addMono(pre, b, H, L.ping * lvl(), 0.1);
    feedKey(b, H, 0.8);
  }
  {
    const d = Math.max(0.5, Q - H - 0.1), r = ratio();
    const b = buf(d + 0.15);
    glide(b, 140 * r, 1100 * r, d, "saw", 0.05, true);
    sweep(b, 400 * r, 6000 * r, d, 0.1, r01);
    normalise(b, 0.32);
    // widen the riser: the noise sweep slowly drifts across the stereo field as it rises
    addMono(pre, b, H + 0.02, L.riser * lvl(), (t) => Math.sin(t * 2.2) * 0.35);
  }

  // --- fact card cue: a soft, low pop when the fact arrives, so the eye knows something new is on screen (no random draws) ---
  if (settings.factCard && settings.factCard.cue) {
    const tF = Q + (settings.factCard.appearSeconds ?? 0.6);
    const b = buf(0.3);
    tone(b, 523 * Math.pow(2, key / 12), 0, 0.16, "sine", 0.1);
    normalise(b, 0.25);
    addMono(pre, b, tF, L.ping * 0.5, -0.1);
  }

  // --- reveal: impact (+ short reverb send) and chime (+ reverb) ---
  {
    const rI = ratio(M.pitchJitterSemitones * 0.6);
    const b = buf(0.85);
    glide(b, 150 * rI, 36 * rI, 0.7, "sine", 0.5, false);
    sweep(b, 300 * rI, 4200 * rI, 0.5, 0.2, r01);
    glide(b, 240 * rI, 70 * rI, 0.22, "sine", 0.42, false);
    tone(b, 110 * rI, 0, 0.18, "triangle", 0.18);
    for (let i = 0, n = Math.floor(0.012 * SR); i < n; i++) b[i] += (r01() * 2 - 1) * 0.35 * Math.pow(1 - i / n, 2);
    normalise(b, 0.85);
    addMono(fx, b, Q, L.impact * VR.fx.impact, 0); // calm reveals: softer thud
    feedKey(b, Q, VR.fx.impact);
    for (let i = 0; i < b.length && Q * SR + i < N; i++) fxSend[Math.round(Q * SR) + i] += b[i] * M.reverb.impactSend * VR.fx.impact;
  }
  {
    const r = ratio();
    const b = buf(1.4);
    tone(b, 880 * r, 0.12, 0.7, "sine", 0.16);
    tone(b, 1318 * r, 0.2, 0.9, "sine", 0.14);
    tone(b, 1760 * r, 0.3, 1.0, "sine", 0.09);
    normalise(b, 0.42);
    addMono(fx, b, Q, L.chime, 0);
    feedKey(b, Q, 0.7);
    for (let i = 0; i < b.length && Math.round(Q * SR) + i < N; i++) fxSend[Math.round(Q * SR) + i] += b[i] * M.reverb.chimeSend;
  }

  // --- whooshes, panned left -> right with the wipe panels ---
  const wipePan = (dur) => (t) => lerp(-M.whooshPan, M.whooshPan, t / dur);
  {
    const r = ratio();
    const b = buf(0.5);
    sweep(b, 300 * r, 2400 * r, 0.45, 0.16, r01); // wipe-in rises
    normalise(b, 0.26);
    const wl = L.whooshIn * lvl(); // (drawn even without a wipe so the random sequence of the other sounds is unchanged)
    if (VR.wipeIn) { addMono(fx, b, 0, wl, wipePan(0.45)); feedKey(b, 0, 0.5); }
  }
  // --- hook hit: a punchy low thud + short click on the very first frame (retention: the clip must grab at 0.0 s) ---
  // Uses its own tiny RNG so the per-round random sequence of the other sounds is unchanged.
  if ((L.hookHit || 0) > 0) {
    const hk = lcg(4242);
    const kr = Math.pow(2, key / 12); // follows the round's key, no RNG draw
    const b = buf(0.5);
    glide(b, 170 * kr, 48 * kr, 0.32, "sine", 0.55, false);
    glide(b, 300 * kr, 90 * kr, 0.12, "sine", 0.35, false);
    sweep(b, 1800 * kr, 500 * kr, 0.16, 0.12, hk);
    for (let i = 0, n = Math.floor(0.006 * SR); i < n; i++) b[i] += (hk() * 2 - 1) * 0.4 * Math.pow(1 - i / n, 2);
    normalise(b, 0.8);
    addMono(fx, b, 0, L.hookHit, 0);
    feedKey(b, 0, 0.9);
  }
  {
    const r = ratio();
    const b = buf(0.5);
    sweep(b, 2400 * r, 300 * r, 0.45, 0.16, r01); // wipe-out falls
    normalise(b, 0.36);
    const wl = L.whoosh * lvl();
    if (VR.wipeOut) { addMono(fx, b, W, wl, wipePan(0.45)); feedKey(b, W, 0.6); }
  }

  // --- reverb bus ---
  const [rvL, rvR] = reverb(fxSend, { room: M.reverb.room, damp: M.reverb.damp, pre: M.reverb.preDelayMs / 1000, width: M.reverb.width });
  for (let i = 0; i < N; i++) { fx.L[i] += rvL[i]; fx.R[i] += rvR[i]; }

  // --- music bed: detuned-saw pad, low-pass sweep opening through the question, side-chained under FX ---
  const pad = mkBus();
  {
    const rootHz = 110 * Math.pow(2, key / 12);          // A2, shifted by this round's key
    const chord = [1, 3 / 2, 2, 2 * 5 / 4 * 1.0].map((x) => x * rootHz); // root, 5th, octave, major 3rd up an octave+
    const lift = [3, 4, 5 / 2 * 2].map((x) => x * rootHz / 2);          // reveal-only brighter voices
    const voices = [];
    chord.forEach((f, i) => voices.push({ f, g: i === 0 ? 1.0 : 0.75, from: 0, panBias: (i % 2 ? 1 : -1) * 0.3 }));
    lift.forEach((f) => voices.push({ f: f * 2, g: 0.5, from: Q, panBias: 0 }));
    const cents = M.padDetuneCents;
    const phases = voices.map(() => [r01(), r01()]);
    const lfoPh = [r01() * 6.28, r01() * 6.28];
    const lp = [{ x1: 0, x2: 0, y1: 0, y2: 0 }, { x1: 0, x2: 0, y1: 0, y2: 0 }];
    for (let n = 0; n < N; n++) {
      const t = n / SR;
      // filter sweep
      let fc;
      if (t < Q) fc = expInterp(M.padFilter.start, M.padFilter.peak, Math.pow(t / Q, 0.9));
      else fc = expInterp(M.padFilter.peak, M.padFilter.end, (t - Q) / (D - Q));
      fc *= 1 + 0.06 * Math.sin(t * 1.3 + lfoPh[0]);
      const w0 = (2 * Math.PI * fc) / SR, cosw = Math.cos(w0), alpha = Math.sin(w0) / (2 * M.padFilter.q);
      const a0 = 1 + alpha, b0 = (1 - cosw) / 2 / a0, b1 = (1 - cosw) / a0, a1 = (-2 * cosw) / a0, a2 = (1 - alpha) / a0;
      // amplitude: fade-in, slow tension swell towards the reveal, little lift at the reveal, fade-out
      const swell = lerp(0.65, 1, t / Q);
      const reveal = t >= Q ? 1 + 0.35 * Math.exp(-(t - Q) / 1.2) : 1;
      const fadeIn = Math.min(1, t / 0.35), fadeOut = Math.min(1, (D - t) / 0.45);
      const amp = swell * reveal * fadeIn * fadeOut;
      const s = [0, 0];
      for (let vi = 0; vi < voices.length; vi++) {
        const v = voices[vi];
        const vg = v.from ? Math.min(1, Math.max(0, (t - v.from) / 0.5)) * v.g : v.g;
        if (vg <= 0) continue;
        for (let c = 0; c < 2; c++) {
          const det = Math.pow(2, ((c ? 1 : -1) * cents * (1 + 0.3 * Math.sin(t * 0.7 + lfoPh[1] + vi))) / 1200);
          const dt = (v.f * det) / SR;
          phases[vi][c] = (phases[vi][c] + dt) % 1;
          const ph = phases[vi][c];
          s[c] += (2 * ph - 1 - polyBlep(ph, dt)) * vg;
        }
      }
      for (let c = 0; c < 2; c++) {
        const f = lp[c];
        const y = b0 * s[c] + b1 * f.x1 + b0 * f.x2 - a1 * f.y1 - a2 * f.y2;
        f.x2 = f.x1; f.x1 = s[c]; f.y2 = f.y1; f.y1 = y;
        (c ? pad.R : pad.L)[n] = y * amp;
      }
    }
    // sub: soft sine an octave under the root (felt more than heard)
    for (let n = 0; n < N; n++) {
      const t = n / SR;
      const a = Math.min(1, t / 0.35) * Math.min(1, (D - t) / 0.45) * 0.35;
      const v = Math.sin(2 * Math.PI * (rootHz / 2) * t) * a;
      pad.L[n] += v; pad.R[n] += v;
    }
    let m = 0;
    for (let n = 0; n < N; n++) m = Math.max(m, Math.abs(pad.L[n]), Math.abs(pad.R[n]));
    const g = M.levels.pad / m;
    for (let n = 0; n < N; n++) { pad.L[n] *= g; pad.R[n] *= g; }
  }

  // --- side-chain: follower on the FX key, ducks the pad (and a little of the pre bus) under effects ---
  const side = new Float32Array(N);
  {
    const att = 1 - Math.exp(-1 / (M.sidechain.attackMs / 1000 * SR)), rel = 1 - Math.exp(-1 / (M.sidechain.releaseMs / 1000 * SR));
    let e = 0;
    for (let n = 0; n < N; n++) {
      const x = sideKey[n];
      e += (x > e ? att : rel) * (x - e);
      side[n] = 1 - (1 - dB(-M.sidechain.depthDb)) * Math.min(1, e / M.sidechain.threshold);
    }
  }

  // --- pre-reveal duck envelope (near-silence for duckLeadMs before the reveal) ---
  const duck = new Float32Array(N).fill(1);
  {
    const floor = dB(-M.duckDepthDb);
    const t1 = Q - M.duckLeadMs / 1000, rampIn = 0.03, rampOut = 0.04;
    for (let n = 0; n < N; n++) {
      const t = n / SR;
      if (t >= t1 - rampIn && t < t1) duck[n] = lerp(1, floor, (t - (t1 - rampIn)) / rampIn);
      else if (t >= t1 && t < Q) duck[n] = floor;
      else if (t >= Q && t < Q + rampOut) duck[n] = lerp(floor, 1, (t - Q) / rampOut);
    }
  }

  // --- sum ---
  const outL = new Float32Array(N), outR = new Float32Array(N);
  for (let n = 0; n < N; n++) {
    const d = duck[n];
    outL[n] = pre.L[n] * d + pad.L[n] * d * side[n] + fx.L[n];
    outR[n] = pre.R[n] * d + pad.R[n] * d * side[n] + fx.R[n];
  }
  return { L: outL, R: outR, key };
}

// ---------- mastering: BS.1770-4 loudness, look-ahead limiter, true-peak ----------
function biquad(x, b0, b1, b2, a1, a2) {
  const y = new Float64Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}
function kWeight(x) {
  let f0 = 1681.974450955533, G = 3.999843853973347, Qf = 0.7071752369554196;
  let K = Math.tan(Math.PI * f0 / SR), Vh = Math.pow(10, G / 20), Vb = Math.pow(Vh, 0.4996667741545416);
  let a0 = 1 + K / Qf + K * K;
  let y = biquad(x, (Vh + Vb * K / Qf + K * K) / a0, 2 * (K * K - Vh) / a0, (Vh - Vb * K / Qf + K * K) / a0, 2 * (K * K - 1) / a0, (1 - K / Qf + K * K) / a0);
  f0 = 38.13547087602444; Qf = 0.5003270373238773;
  K = Math.tan(Math.PI * f0 / SR); a0 = 1 + K / Qf + K * K;
  return biquad(y, 1, -2, 1, 2 * (K * K - 1) / a0, (1 - K / Qf + K * K) / a0);
}
function lufs(L, R) {
  const kl = kWeight(L), kr = kWeight(R);
  const blk = Math.round(0.4 * SR), hop = Math.round(0.1 * SR);
  const z = [];
  for (let s = 0; s + blk <= L.length; s += hop) {
    let sl = 0, sr = 0;
    for (let i = s; i < s + blk; i++) { sl += kl[i] * kl[i]; sr += kr[i] * kr[i]; }
    z.push(sl / blk + sr / blk);
  }
  const ld = (v) => -0.691 + 10 * Math.log10(v);
  const abs = z.filter((v) => ld(v) > -70);
  if (!abs.length) return -Infinity;
  const rel = ld(abs.reduce((a, b) => a + b, 0) / abs.length) - 10;
  const g = abs.filter((v) => ld(v) > rel);
  return ld(g.reduce((a, b) => a + b, 0) / g.length);
}
// 4x oversampled true peak (windowed-sinc, 32 taps/phase)
const TP_TAPS = 16;
const TP_K = [1, 2, 3].map((ph) => {
  const f = ph / 4, k = [];
  for (let j = -TP_TAPS + 1; j <= TP_TAPS; j++) {
    const x = j - f;
    const sinc = Math.abs(x) < 1e-9 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
    const w = 0.5 + 0.5 * Math.cos(Math.PI * x / (TP_TAPS + 0.5)); // Hann window
    k.push(sinc * w);
  }
  return k;
});
function truePeak(ch) {
  let p = 0;
  for (let i = 0; i < ch.length; i++) {
    const a = Math.abs(ch[i]);
    p = Math.max(p, a);
    if (a < 0.3) continue;
    for (const k of TP_K) {
      let s = 0;
      for (let j = 0; j < k.length; j++) {
        const idx = i + j - TP_TAPS + 1;
        if (idx >= 0 && idx < ch.length) s += ch[idx] * k[j];
      }
      p = Math.max(p, Math.abs(s));
    }
  }
  return p;
}
function limit(L, R, ceil) {
  const n = L.length, A = Math.round(0.005 * SR), rel = 1 - Math.exp(-1 / (0.09 * SR));
  const g = new Float64Array(n);
  for (let i = 0; i < n; i++) { const p = Math.max(Math.abs(L[i]), Math.abs(R[i])); g[i] = p > ceil ? ceil / p : 1; }
  // windowed minimum (+-A) via monotonic deque
  const g1 = new Float64Array(n), dq = [];
  let head = 0, nextIn = 0;
  for (let i = 0; i < n; i++) {
    while (nextIn <= Math.min(n - 1, i + A)) {
      while (dq.length > head && g[dq[dq.length - 1]] >= g[nextIn]) dq.pop();
      dq.push(nextIn++);
    }
    while (dq[head] < i - A) head++;
    g1[i] = g[dq[head]];
  }
  const relx = new Float64Array(n);
  let cur = 1;
  for (let i = 0; i < n; i++) { cur = g1[i] < cur ? g1[i] : cur + (g1[i] - cur) * rel; relx[i] = cur; }
  // moving average (+-A) -> smooth attack, never above g1 in the neighbourhood
  const cs = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) cs[i + 1] = cs[i] + relx[i];
  let minGain = 1;
  const oL = new Float32Array(n), oR = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - A), b = Math.min(n - 1, i + A);
    const gs = (cs[b + 1] - cs[a]) / (b - a + 1);
    minGain = Math.min(minGain, gs);
    oL[i] = L[i] * gs; oR[i] = R[i] * gs;
  }
  return { L: oL, R: oR, minGain };
}
function master(mix) {
  const target = M.targetLufs, tpMax = dB(M.truePeakDb);
  const L0 = lufs(mix.L, mix.R);
  let gainDb = target - L0, ceil = tpMax * 0.97, res;
  for (let it = 0; it < 8; it++) {
    const g = dB(gainDb);
    const sL = mix.L.map((v) => v * g), sR = mix.R.map((v) => v * g);
    res = limit(sL, sR, ceil);
    const l = lufs(res.L, res.R);
    const tp = Math.max(truePeak(res.L), truePeak(res.R));
    res.lufs = l; res.tp = tp;
    const okL = Math.abs(l - target) < 0.15, okP = tp <= tpMax;
    if (okL && okP) break;
    if (!okP) ceil *= (tpMax / tp) * 0.995;
    if (!okL) gainDb += target - l;
  }
  res.preLufs = L0;
  return res;
}

function writeWav(file, L, R) {
  const n = L.length, pcm = Buffer.alloc(44 + n * 4);
  pcm.write("RIFF", 0); pcm.writeUInt32LE(36 + n * 4, 4); pcm.write("WAVE", 8);
  pcm.write("fmt ", 12); pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(2, 22);
  pcm.writeUInt32LE(SR, 24); pcm.writeUInt32LE(SR * 4, 28); pcm.writeUInt16LE(4, 32); pcm.writeUInt16LE(16, 34);
  pcm.write("data", 36); pcm.writeUInt32LE(n * 4, 40);
  const rd = lcg(99);
  const q = (v) => Math.max(-32768, Math.min(32767, Math.round(v * 32767 + (rd() - rd()) * 0.5))); // TPDF dither
  for (let i = 0; i < n; i++) { pcm.writeInt16LE(q(L[i]), 44 + i * 4); pcm.writeInt16LE(q(R[i]), 46 + i * 4); }
  fs.writeFileSync(file, pcm);
}

// ---------- main ----------
const { rounds } = readSourceRounds();
roundsCount = rounds.length;
const only = flag("only", null);
const ids = only && only !== true ? String(only).split(",").map(Number) : null;
const todo = ids ? rounds.filter((r) => ids.includes(r.id)) : rounds;
const cacheFile = path.join(outDir, ".mixhash.json");
let cache = {};
try { cache = JSON.parse(fs.readFileSync(cacheFile, "utf8")); } catch {}
const codeHash = crypto.createHash("sha1").update(fs.readFileSync(__filename)).update(fs.readFileSync(path.join(__dirname, "..", "src", "variation.js"))).update(JSON.stringify([M, Q, H, W, D, settings.variety || null, settings.letterHints || null, settings.factCard || null])).digest("hex");
const force = flag("force", false) === true;
let built = 0, kept = 0;
for (const r of todo) {
  const file = path.join(outDir, `${r.id}.wav`);
  const h = crypto.createHash("sha1").update(codeHash).update(String(r.id)).update(JSON.stringify([varOf(r).fx.impact, varOf(r).wipeIn, varOf(r).wipeOut])).digest("hex");
  if (!force && cache[r.id] === h && fs.existsSync(file)) { kept++; continue; }
  const t0 = Date.now();
  const mix = buildRound(r);
  const res = master(mix);
  writeWav(file, res.L, res.R);
  cache[r.id] = h;
  built++;
  console.log(`[mix] #${r.id}  key ${mix.key >= 0 ? "+" : ""}${mix.key.toFixed(2)} st   ${res.lufs.toFixed(2)} LUFS (pre ${res.preLufs.toFixed(1)})   true-peak ${(20 * Math.log10(res.tp)).toFixed(2)} dBTP   max limiting ${(-20 * Math.log10(res.minGain)).toFixed(1)} dB   ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
console.log(`[mix] built ${built}, up to date ${kept}`);
