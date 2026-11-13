// Video 02 — "Guess the Game Character" silhouette marathon. Single source of truth for the game-quiz compositions.
// Everything that can be tuned (timing, tiers, colours, copy) lives here, not in the components.
import characters from "./characters.json";
import generated from "./characters.generated.json"; // { images: {file: bool}, vo: {clipId: seconds} } written by scripts/game-prepare.js

export const G = {
  fps: 60,
  width: 2560,
  height: 1440,
  total: 50,
  questionSeconds: 6, // silhouette on screen, countdown running
  revealSeconds: 2, // answer shown
  // Tiers by round number. The level-up stingers (step 4) sit on the boundaries: 12|13, 25|26, 38|39.
  tiers: [
    { key: "easy", label: "EASY", from: 1, to: 12, accent: "#4FA8FF", bg: ["#17407E", "#0B1F4A", "#030816"] }, // cool blue
    { key: "medium", label: "MEDIUM", from: 13, to: 25, accent: "#B07CFF", bg: ["#3F1E7A", "#1F0F45", "#07031A"] }, // deep purple
    { key: "hard", label: "HARD", from: 26, to: 38, accent: "#FF4D5E", bg: ["#6A1424", "#35091A", "#0C0206"] }, // dark crimson
    { key: "expert", label: "EXPERT", from: 39, to: 50, accent: "#FFC83D", bg: ["#2A2412", "#14110A", "#030303"] }, // gold / obsidian
  ],
  // Shrinking-bar timer (step 2): green -> yellow when `yellowAtLeft` seconds remain -> flashing red for the last `redAtLeft` seconds.
  timer: {
    green: "#3DDC97",
    yellow: "#FFC83D",
    red: "#FF3B4E",
    yellowAtLeft: 3,
    redAtLeft: 2,
    tickEvery: 1, // seconds between ticks
    fastTickEvery: 0.5, // tick tempo during the red phase
    flashHz: 5, // red-phase flash rate
  },
  // Camera motion (step 3): gentle zoom while the clock runs, snap punch-in on the reveal.
  motion: {
    zoomFrom: 1.0,
    zoomTo: 1.05, // 100% -> 105% across the question phase
    punchPeak: 1.22, // reveal snap zoom peak
    punchSettle: 1.1, // where the reveal settles
    punchSeconds: 0.14, // time to reach the peak
    flashOpacity: 0.55, // white flash on the reveal frame
  },
  // Bonus rounds: a pattern-interrupt clip inserted AFTER the listed round (novelty resets attention; bonus 5 sits just before the final push).
  // Each clip = intro splash (introSeconds) + guessing time (item.seconds, shown on the timer bar) + reveal (revealSeconds, long enough to read the fact).
  // They use their own look (BonusBackground: rotating sunburst, diamond pattern, marquee lights, confetti) so they never read as a normal round.
  // `after` must NOT clash with a stinger round (12, 25, 38). Order below = order in the video.
  bonus: {
    introSeconds: 1.8,
    revealSeconds: 4.5,
    items: [
      // EMOJI DECODER: three emojis spell a game. Hint chip shows when 3 s are left. 9 s to think.
      { key: "emoji", after: 10, label: "EMOJI DECODER", accent: "#FF4FD8", prompt: "Which game do these emojis spell?", seconds: 9, tiles: ["🐦", "😠", "🐷"], hint: "Mobile · slingshots", answer: "Angry Birds", sub: "Rovio · 2009", fact: "It was Rovio's 52nd game. The studio had made 51 before it." },
      // HIGHER OR LOWER (duel): which of two games came out first. Years are hidden until the reveal. 8 s to think.
      { key: "versus", after: 20, label: "WHO CAME FIRST?", accent: "#7CFF4F", prompt: "Which game came out FIRST?", seconds: 8, hint: "Both are arcade classics", cards: [{ tag: "A", title: "Donkey Kong", line: "Nintendo · Arcade", year: "1981" }, { tag: "B", title: "Pac-Man", line: "Namco · Arcade", year: "1980" }], winner: 1, answer: "B · Pac-Man", sub: "Released May 1980 (Japan)", fact: "It reached arcades more than a year before Donkey Kong (July 1981)." },
      // CONSOLE BY CONTROLLER: black controller silhouette + four console choices (A-D). Hint at 3 s left. 8 s to think.
      { key: "controller", after: 30, label: "NAME THAT CONSOLE", accent: "#38E1FF", prompt: "Which console uses this controller?", seconds: 8, hint: "Released in 1996", choices: ["PlayStation", "Sega Genesis", "Nintendo 64", "Super Nintendo"], answer: "C · Nintendo 64", sub: "Released 1996", fact: "Its controller had three handles, with the analog stick on the middle one." },
    ],
  },
  // Level-up stingers (step 4): a 1-second full-screen card inserted AFTER the listed round, themed with the NEXT tier's colours.
  stingerSeconds: 1,
  stingers: [
    { after: 12, kicker: "LEVEL 1 COMPLETE!", title: "Entering Medium Mode...", next: "medium" },
    { after: 25, kicker: "LEVEL 2 COMPLETE!", title: "Entering Hard Mode...", next: "hard" },
    { after: 38, kicker: "WARNING", title: "Level 4 Expert Mode — Most People Fail Here!", next: "expert" },
  ],
  // Persistent overlays (step 5): Round X/50 counter top-right; a short micro-challenge prompt every `promptEvery` rounds.
  prompts: {
    every: 4, // shown on rounds 4, 8, 12 ... (never on the unresolved final round)
    fromSeconds: 1.0,
    texts: ["Did you get this in under 2 seconds?", "If you missed this, you owe 1 point!", "Share your streak so far in the comments!"],
  },
  // Unresolved final round (step 6): the last round runs its timer as usual, but the answer is NOT revealed.
  // It fades to black with a comment-driver message; put the answer in the pinned comment.
  final: {
    seconds: 5, // end-card length after the countdown
    fadeSeconds: 0.7,
    kicker: "Did you figure out #50?",
    text: "Tell us in the comments before checking the pinned comment for the answer!",
  },
  // Voiceover (step 7). Clips live in clips_game/ (NNN_g01_question.wav ...), `npm run game:prepare` measures them.
  // Question line plays first, the countdown starts when it ends; the reveal line plays at the reveal and the reveal
  // (or the Round 50 end card) automatically stretches if the line is longer than the default.
  voice: {
    qStart: 0.3, // question line starts this long into the round
    pad: 0.15, // breathing room between the end of the question line and the timer pop
    maxPreRoll: 3, // a runaway question clip never delays the timer more than this (prepare warns)
    rStart: 0.25, // reveal line starts this long after the reveal hit
    rTail: 0.45, // silence after the reveal line before the next round
    overlapRounds: [1], // timer runs from 0:00 and the question line plays OVER it (keeps the cold-open hook)
    stingerPad: 0.25, // stinger length = max(stingerSeconds, stinger clip + this)
    volume: 1,
    duckSfx: 0.4, // chime/impact volume multiplier while a reveal line is speaking
  },
  // Background music: one seamless 16 s loop per tier (120 BPM, so the 1 s ticks land on every 2nd beat), generated by
  // scripts/generate-game-music.py into public/music/. The tier's loop starts at the level-up stinger that announces it
  // (the stinger whoosh/impact covers the switch) and runs until the next stinger; the last tier fades out over endFadeSeconds.
  music: {
    enabled: true,
    volume: 0.3, // bed level under the voiceover (voice = 1). Loops are normalised to a 0.9 peak.
    fadeSeconds: 0.25, // fade in/out at each tier switch
    endFadeSeconds: 3,
    files: { easy: "music/game-easy.wav", medium: "music/game-medium.wav", hard: "music/game-hard.wav", expert: "music/game-expert.wav" },
  },
  hook: {
    headline: "Can you identify all 50 gaming legends?",
    headlineSeconds: 3.2,
    teaserRound: 48, // an impossible-looking Expert silhouette is flashed in the corner
    teaserText: "Only 5% get Round 48 right.",
    teaserFrom: 1.0,
    teaserSeconds: 1.0,
  },
};

const IMAGES = generated.images || {};
const VO = generated.vo || {};
const flag = (c) => Boolean(IMAGES[c.imageFile]);
export const CHARACTERS = characters.map((c) => ({ ...c, hasImage: flag(c) }));
export const getCharacter = (id) => CHARACTERS.find((c) => c.id === Number(id));
export const tierOf = (id) => G.tiers.find((t) => id >= t.from && id <= t.to) || G.tiers[G.tiers.length - 1];

export const roundFrames = Math.round((G.questionSeconds + G.revealSeconds) * G.fps); // default (no voiceover) length

// Tick schedule (seconds from clip start): steady ticks, then a faster tempo (higher pitch) in the final red phase.
export const tickTimes = (total = G.questionSeconds) => {
  const { tickEvery, fastTickEvery, redAtLeft } = G.timer;
  const fastFrom = total - redAtLeft;
  const out = [];
  for (let s = 0; s < fastFrom - 1e-6; s += tickEvery) out.push({ t: s, fast: false });
  for (let s = fastFrom; s < total - 1e-6; s += fastTickEvery) out.push({ t: s, fast: true });
  return out;
};

export const stingerFrames = Math.round(G.stingerSeconds * G.fps); // default length
export const stingerAfter = (roundId) => G.stingers.find((x) => x.after === Number(roundId));
export const tierByKey = (key) => G.tiers.find((t) => t.key === key);

// Prompt text for a round, or null. Rotates through prompts.texts so neighbouring prompt rounds differ.
export const promptFor = (id) => {
  const { every, texts } = G.prompts;
  if (id >= G.total || id % every !== 0) return null;
  return texts[(id / every - 1) % texts.length];
};

// ---- voiceover-aware timing ------------------------------------------------------------------------------------------
const pad2 = (n) => String(n).padStart(2, "0");
export const qClipId = (id) => `g${pad2(id)}_question`;
export const rClipId = (id) => `g${pad2(id)}_reveal`; // Round 50: the line spoken over the end card
export const stingerClipId = (index) => `stinger_${index + 1}`;
export const voDuration = (clipId) => (VO[clipId] != null ? VO[clipId] : null);
export const voSrc = (clipId) => `game-vo/${clipId}.wav`;

// Everything about one round's timing, in seconds from the clip start:
//   pre      question line plays, timer not running yet (0 = no question clip, or an overlap round)
//   qEnd     the countdown ended / the reveal hits  (= pre + questionSeconds)
//   total    clip length (reveal stretches to fit the reveal line)
export const timeline = (id) => {
  const n = Number(id);
  const V = G.voice;
  const qd = voDuration(qClipId(n));
  const rd = voDuration(rClipId(n));
  const isFinal = n === G.total;
  const pre = qd != null && !V.overlapRounds.includes(n) ? Math.min(V.maxPreRoll, V.qStart + qd + V.pad) : 0;
  const qEnd = pre + G.questionSeconds;
  const rStartAt = isFinal ? G.final.fadeSeconds * 0.6 : V.rStart; // seconds after qEnd
  const base = isFinal ? G.final.seconds : G.revealSeconds;
  const revealLen = rd != null ? Math.max(base, rStartAt + rd + V.rTail) : base;
  return { n, pre, qEnd, revealLen, total: qEnd + revealLen, qd, rd, rStartAt, isFinal };
};
export const framesFor = (id) => Math.round(timeline(id).total * G.fps);

// Stinger length stretches to fit its optional clip (stinger_1..3).
export const stingerSecondsFor = (index) => {
  const d = voDuration(stingerClipId(index));
  return d != null ? Math.max(G.stingerSeconds, d + G.voice.stingerPad) : G.stingerSeconds;
};
export const stingerFramesFor = (index) => Math.round(stingerSecondsFor(index) * G.fps);

// ---- global timeline (for the background) -----------------------------------------------------------------------------
// Frame at which a round / stinger starts inside the full GameVideo. GameBackground uses this so its grid scroll and icon
// drift continue unbroken across clips (every clip is its own Sequence, so useCurrentFrame() alone restarts at 0).
// Bonus clip length: intro splash + guessing time + reveal.
export const bonusSecondsFor = (index) => G.bonus.introSeconds + G.bonus.items[index].seconds + G.bonus.revealSeconds;
export const bonusFramesFor = (index) => Math.round(bonusSecondsFor(index) * G.fps);

// The whole video as one ordered list: round -> its bonus clip(s) -> its level-up stinger (if any).
// Everything that needs "where does this clip start" or "how long is the video" reads this one list.
export const SEGMENTS = (() => {
  const out = [];
  let f = 0;
  const push = (seg, frames) => { out.push({ ...seg, from: f, frames }); f += frames; };
  CHARACTERS.slice(0, G.total).forEach((c) => {
    push({ kind: "round", id: c.id }, framesFor(c.id));
    G.bonus.items.forEach((b, i) => { if (b.after === c.id) push({ kind: "bonus", index: i }, bonusFramesFor(i)); });
    G.stingers.forEach((s, i) => { if (s.after === c.id) push({ kind: "stinger", index: i }, stingerFramesFor(i)); });
  });
  return out;
})();
export const totalVideoFrames = SEGMENTS.reduce((n, s) => n + s.frames, 0);
const startOf = (pred) => { const s = SEGMENTS.find(pred); return s ? s.from : 0; };
export const roundStartFrame = (id) => startOf((s) => s.kind === "round" && s.id === Number(id));
export const stingerStartFrame = (index) => startOf((s) => s.kind === "stinger" && s.index === index);
export const bonusStartFrame = (index) => startOf((s) => s.kind === "bonus" && s.index === index);
