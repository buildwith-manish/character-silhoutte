// Video 02 — "Guess the Game Character" silhouette marathon. Single source of truth for the game-quiz compositions.
// Everything that can be tuned (timing, tiers, colours, copy) lives here, not in the components.
import characters from "./characters.json";
import generated from "./characters.generated.json";

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
  hook: {
    headline: "Can you identify all 50 gaming legends?",
    headlineSeconds: 3.2,
    teaserRound: 48, // an impossible-looking Expert silhouette is flashed in the corner
    teaserText: "Only 5% get Round 48 right.",
    teaserFrom: 1.0,
    teaserSeconds: 1.0,
  },
};

const flag = (c) => Boolean(generated[c.imageFile]);
export const CHARACTERS = characters.map((c) => ({ ...c, hasImage: flag(c) }));
export const getCharacter = (id) => CHARACTERS.find((c) => c.id === Number(id));
export const tierOf = (id) => G.tiers.find((t) => id >= t.from && id <= t.to) || G.tiers[G.tiers.length - 1];

export const roundFrames = Math.round((G.questionSeconds + G.revealSeconds) * G.fps);
export const questionFrames = Math.round(G.questionSeconds * G.fps);

// Tick schedule (seconds from clip start): steady ticks, then a faster tempo (higher pitch) in the final red phase.
export const tickTimes = () => {
  const { tickEvery, fastTickEvery, redAtLeft } = G.timer;
  const fastFrom = G.questionSeconds - redAtLeft;
  const out = [];
  for (let s = 0; s < fastFrom - 1e-6; s += tickEvery) out.push({ t: s, fast: false });
  for (let s = fastFrom; s < G.questionSeconds - 1e-6; s += fastTickEvery) out.push({ t: s, fast: true });
  return out;
};
