#!/usr/bin/env node
// Soundtracks for the long-video cards (intro / recap / recap2 / outro) -> public/sounds/cards/<name>.wav
// Built with ffmpeg from the same one-shot sounds as the quiz clips (public/sounds/*.wav) plus a soft detuned-sine pad bed,
// then loudness-matched with a two-pass loudnorm to the same target as the rounds (settings.mix.targetLufs / truePeakDb).
//   node scripts/generate-card-sounds.js
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { P, has } = require("./lib");

if (!has("ffmpeg")) { console.error("[cards] ffmpeg not found."); process.exit(1); }
const settings = JSON.parse(fs.readFileSync(P.settings, "utf8"));
const ST = settings.structure || {};
const SR = 44100;
const sec = (k, d) => Math.max(1, (ST[k] && ST[k].seconds) || d);
const snd = (n) => path.join(P.root, "public", "sounds", n);
const outDir = path.join(P.root, "public", "sounds", "cards");
fs.mkdirSync(outDir, { recursive: true });

// cue = [file, startSeconds, volume, pitchRatio]
const teaserDur = Math.max(1, (ST.intro && ST.intro.teaserSeconds) || 2);
const CARDS = {
  // Teaser: 2 s cold open — three quick impact flashes (one per freeze frame) then a whoosh into the Intro.
  teaser: {
    dur: teaserDur,
    cues: [
      ["whoosh-in.wav",  0,                          0.6,  1    ], // immediate energy on first frame
      ["ping.wav",       teaserDur * 0.05,           0.55, 1    ], // first freeze frame
      ["ping.wav",       teaserDur * 0.37,           0.55, 1.122], // second freeze frame
      ["ping.wav",       teaserDur * 0.70,           0.55, 1.26 ], // third freeze frame
      ["whoosh.wav",     teaserDur - 0.5,            0.7,  1    ], // wipe-out into Intro
    ],
    padFadeIn: 0.1, padFadeOut: 0.3,
  },
  // Intro: now 3 s — cues compressed to fit the shorter card.
  intro: {
    dur: sec("intro", 3),
    cues: [
      ["impact.wav", 0.05, 0.55, 1],                               // title slams in
      ["ping.wav",   0.42, 0.65, 1    ], ["ping.wav", 0.84, 0.65, 1.122], ["ping.wav", 1.26, 0.65, 1.26], // the three rules
      ["riser.wav",  0.9,  0.5,  1   ],                             // builds into READY?
      ["impact.wav", 2.3,  0.8,  1   ], ["chime.wav", 2.3, 0.7, 1], // READY?
      ["whoosh.wav", 2.6,  0.7,  1   ],                             // wipe-out into question 1
    ],
    padFadeIn: 0.2, padFadeOut: 0.3,
  },
  recap: {
    dur: sec("recap", 4.5),
    cues: [
      ["whoosh-in.wav", 0, 0.6, 1],
      ["impact.wav", 0.5, 0.4, 1], ["chime.wav", 0.55, 0.65, 1], // SCORE CHECK
      ["ping.wav", 0.95, 0.6, 1.122], // bar fills
      ["ping.wav", 1.55, 0.7, 1.26], // the ask
      ["whoosh.wav", 4.0, 0.7, 1],
    ],
    padFadeIn: 0.3, padFadeOut: 0.45,
  },
  // Second score check (recap2): same shape as the first, with an extra rising ping for the "beat your score" ask.
  recap2: {
    dur: sec("recap2", 4.5),
    cues: [
      ["whoosh-in.wav", 0, 0.6, 1],
      ["impact.wav", 0.5, 0.45, 1], ["chime.wav", 0.55, 0.65, 1.122], // SCORE CHECK
      ["ping.wav", 0.95, 0.6, 1.26], // bar fills
      ["ping.wav", 1.55, 0.7, 1.414], ["ping.wav", 1.8, 0.6, 1.682], // the ask (rising)
      ["whoosh.wav", 4.0, 0.7, 1],
    ],
    padFadeIn: 0.3, padFadeOut: 0.45,
  },
  outro: {
    dur: sec("outro", 8),
    cues: [
      ["whoosh-in.wav", 0, 0.6, 1],
      ["impact.wav", 0.65, 0.6, 1], ["chime.wav", 0.7, 0.7, 1], // HOW MANY DID YOU GET?
      ["ping.wav", 2.0, 0.6, 1], ["ping.wav", 2.45, 0.6, 1.122], ["ping.wav", 2.9, 0.6, 1.26], ["ping.wav", 3.35, 0.6, 1.414], // tiers
      ["ping.wav", 4.6, 0.7, 1.5], ["chime.wav", 4.65, 0.55, 1.5], // subscribe
    ],
    padFadeIn: 0.3, padFadeOut: 1.0,
  },
};
const PAD = [[110, 1], [110.7, 0.8], [165, 0.7], [165.9, 0.55], [220, 0.5], [277.2, 0.35]]; // A2 / E3 / A3 / C#4, slightly detuned

function ff(args) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-nostdin", "-y", ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`ffmpeg failed:\n${(r.stderr || "").split("\n").slice(-12).join("\n")}`);
  return r.stderr;
}

for (const [name, c] of Object.entries(CARDS)) {
  const inputs = [], chains = [], labels = [];
  const add = (a) => { inputs.push(...a); return inputs.filter((x) => x === "-i").length - 1; };
  // pad bed
  PAD.forEach(([f, g], i) => {
    const k = add(["-f", "lavfi", "-t", String(c.dur), "-i", `sine=frequency=${f}:sample_rate=${SR}`]);
    chains.push(`[${k}:a]aformat=sample_fmts=fltp:channel_layouts=stereo,volume=${(g * 0.05).toFixed(3)}[p${i}]`);
  });
  chains.push(`${PAD.map((_, i) => `[p${i}]`).join("")}amix=inputs=${PAD.length}:normalize=0,lowpass=f=900,tremolo=f=0.35:d=0.25,` +
    `afade=t=in:st=0:d=${c.padFadeIn},afade=t=out:st=${(c.dur - c.padFadeOut).toFixed(2)}:d=${c.padFadeOut}[pad]`);
  labels.push("[pad]");
  // one-shot cues
  c.cues.forEach(([file, at, vol, ratio], i) => {
    const k = add(["-i", snd(file)]);
    const pitch = ratio !== 1 ? `asetrate=${Math.round(SR * ratio)},aresample=${SR},` : "";
    chains.push(`[${k}:a]aresample=${SR},${pitch}aformat=sample_fmts=fltp:channel_layouts=stereo,volume=${vol},adelay=${Math.round(at * 1000)}:all=1[c${i}]`);
    labels.push(`[c${i}]`);
  });
  const base = `${chains.join(";")};${labels.join("")}amix=inputs=${labels.length}:normalize=0:duration=longest,atrim=duration=${c.dur},apad=whole_dur=${c.dur},alimiter=limit=0.9`;
  const target = settings.mix.targetLufs, tp = settings.mix.truePeakDb;
  // pass 1: measure
  const err = ff([...inputs, "-filter_complex", `${base},loudnorm=I=${target}:TP=${tp}:LRA=11:print_format=json[o]`, "-map", "[o]", "-f", "null", "-"]);
  const m = JSON.parse(err.slice(err.lastIndexOf("{"), err.lastIndexOf("}") + 1));
  // pass 2: linear normalisation with the measured values, back to 44.1 kHz stereo 16-bit
  const ln = `loudnorm=I=${target}:TP=${tp}:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
  const file = path.join(outDir, `${name}.wav`);
  ff([...inputs, "-filter_complex", `${base},${ln},aresample=${SR},atrim=duration=${c.dur},apad=whole_dur=${c.dur}[o]`, "-map", "[o]", "-ac", "2", "-ar", String(SR), "-c:a", "pcm_s16le", file]);
  console.log(`[cards] ${name}.wav  ${c.dur}s  (input ${m.input_i} LUFS -> ${target})`);
}
