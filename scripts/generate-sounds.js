#!/usr/bin/env node
// Synthesises the seven sound effects into public/sounds/*.wav (16-bit mono, 44.1 kHz).
// Same recipes as the preview's WebAudio synth: tick, tick-high, ping, riser, impact, chime, whoosh.
const fs = require("fs");
const path = require("path");
const { P } = require("./lib");

const SR = 44100;
// Each effect is normalised to its own target peak (0..1) so the mix is balanced in the final video:
// quiet cues (tick, riser, whoosh) are lifted so they stay audible on phone speakers, the impact is held back.
// Per-sound volume in settings.json stays a 0..1 trim on top of this.
const TARGET = { "tick.wav": 0.30, "tick-high.wav": 0.34, "ping.wav": 0.38, "riser.wav": 0.32, "impact.wav": 0.85, "chime.wav": 0.42, "whoosh.wav": 0.36, "whoosh-in.wav": 0.26 };
const settings = JSON.parse(fs.readFileSync(P.settings, "utf8"));
const Q = settings.questionSeconds, H = settings.hintAtSeconds;
const outDir = path.join(P.root, "public", "sounds");
fs.mkdirSync(outDir, { recursive: true });

let seed = 12345;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const expInterp = (a, b, x) => a * Math.pow(b / a, x);

// WebAudio-style gain automation: .0001 -> vol (exponential) -> .0001 (exponential)
function gainAt(t, attackEnd, vol, end) {
  if (t < 0) return 0;
  if (t < attackEnd) return expInterp(0.0001, vol, t / attackEnd);
  if (t < end) return expInterp(vol, 0.0001, (t - attackEnd) / (end - attackEnd));
  return 0.0001;
}

function waveBL(type, phase, f) {
  // band-limited square / saw / sine
  if (type === "sine") return Math.sin(phase);
  if (type === "triangle") return (2 / Math.PI) * Math.asin(Math.sin(phase));
  let s = 0;
  const maxK = Math.floor(20000 / f);
  if (type === "square") for (let k = 1; k <= maxK; k += 2) s += Math.sin(k * phase) / k;
  else for (let k = 1; k <= maxK; k++) s += ((k % 2 ? 1 : -1) * Math.sin(k * phase)) / k;
  return type === "square" ? (4 / Math.PI) * s : (2 / Math.PI) * s;
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

function sweep(out, f0, f1, dur, vol) {
  const n = Math.floor(dur * SR);
  const Qf = 1.4;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < n && i < out.length; i++) {
    const t = i / SR;
    const f = expInterp(f0, f1, t / dur);
    const w0 = (2 * Math.PI * f) / SR, alpha = Math.sin(w0) / (2 * Qf), a0 = 1 + alpha;
    const b0 = alpha / a0, b2 = -alpha / a0, a1 = (-2 * Math.cos(w0)) / a0, a2 = (1 - alpha) / a0;
    const x0 = rnd();
    const y0 = b0 * x0 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x0; y2 = y1; y1 = y0;
    out[i] += y0 * gainAt(t, dur * 0.35, vol, dur);
  }
}

function writeWav(name, data) {
  let raw = 0;
  for (let i = 0; i < data.length; i++) raw = Math.max(raw, Math.abs(data[i]));
  const MASTER = (TARGET[name] || 0.8) / raw;
  let peak = 0;
  for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i] * MASTER));
  const pcm = Buffer.alloc(44 + data.length * 2);
  pcm.write("RIFF", 0); pcm.writeUInt32LE(36 + data.length * 2, 4); pcm.write("WAVE", 8);
  pcm.write("fmt ", 12); pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(1, 22);
  pcm.writeUInt32LE(SR, 24); pcm.writeUInt32LE(SR * 2, 28); pcm.writeUInt16LE(2, 32); pcm.writeUInt16LE(16, 34);
  pcm.write("data", 36); pcm.writeUInt32LE(data.length * 2, 40);
  for (let i = 0; i < data.length; i++) {
    const v = Math.max(-1, Math.min(1, data[i] * MASTER));
    pcm.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  fs.writeFileSync(path.join(outDir, name), pcm);
  console.log(`[sounds] ${name.padEnd(14)} ${(data.length / SR).toFixed(2)}s  peak ${peak.toFixed(2)}`);
}

let b;
b = buf(0.1); tone(b, 1500, 0, 0.05, "square", 0.05); writeWav("tick.wav", b);
b = buf(0.1); tone(b, 2100, 0, 0.06, "square", 0.07); writeWav("tick-high.wav", b);
b = buf(0.35); tone(b, 1046, 0, 0.28, "sine", 0.12); writeWav("ping.wav", b);
{
  const d = Math.max(0.5, Q - H - 0.1);
  b = buf(d + 0.15); glide(b, 140, 1100, d, "saw", 0.05, true); sweep(b, 400, 6000, d, 0.1); writeWav("riser.wav", b);
}
// Impact: the original sub-bass drop + noise sweep, plus a mid-range thump (240 -> 70 Hz, audible on phone speakers)
// and a very short noise click for the attack transient.
b = buf(0.85); glide(b, 150, 36, 0.7, "sine", 0.5, false); sweep(b, 300, 4200, 0.5, 0.2);
glide(b, 240, 70, 0.22, "sine", 0.42, false);
tone(b, 110, 0, 0.18, "triangle", 0.18);
for (let i = 0, n = Math.floor(0.012 * SR); i < n; i++) b[i] += rnd() * 0.35 * Math.pow(1 - i / n, 2);
writeWav("impact.wav", b);
b = buf(1.4);
tone(b, 880, 0.12, 0.7, "sine", 0.16); tone(b, 1318, 0.2, 0.9, "sine", 0.14); tone(b, 1760, 0.3, 1.0, "sine", 0.09);
writeWav("chime.wav", b);
b = buf(0.5); sweep(b, 2400, 300, 0.45, 0.16); writeWav("whoosh.wav", b);
// Soft rising whoosh for the wipe-in at 0 s: pairs with the falling whoosh at the wipe-out so back-to-back clips flow.
b = buf(0.5); sweep(b, 300, 2400, 0.45, 0.16); writeWav("whoosh-in.wav", b);
