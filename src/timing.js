// Every frame number in the video is derived from settings.json. Nothing is hardcoded in components.
// Times are exposed in seconds (T.*) and frames (F.*). t = frame / fps.
import settings from "../settings.json";

const fps = settings.fps;
const Q = settings.questionSeconds; // question phase ends, reveal starts
const H = settings.hintAtSeconds; // hint card appears
const W = Q + settings.revealSeconds; // reveal ends, wipe-out starts
const D = W + settings.wipeSeconds; // end of the clip

export const T = {
  fps,
  Q,
  H,
  W,
  D,
  totalFrames: Math.round(D * fps),
  segments: Math.round(Q), // one countdown segment per second
  redSeconds: 3, // last N seconds of the countdown turn red
  urgencySeconds: 1.5, // red vignette + bar turn red
};

// Moments with fast motion (wipe-in + header/prompt, snap-zoom + letter stamps + cards, wipe-out): camera motion blur is
// only switched on inside these windows (seconds), so the rest of the clip renders at normal speed.
T.blurWindows = [
  [0, 1.3],
  [Q - 0.35, Q + 2.1],
  [W - 0.15, D + 0.01],
];

const f = (s) => Math.round(s * fps);
export const F = {
  total: T.totalFrames,
  question: f(Q),
  hint: f(H),
  reveal: f(Q),
  wipeOut: f(W),
};

// LEGACY one-shot cue list (no longer used by Round.jsx; the soundtrack is now one mastered file per round, see scripts/generate-mix.js).
// Audio cues: [frame, key into settings.audio]. Mirrors the reference preview:
// tick each second (higher for the last 3), ping at the hint, riser hint -> reveal,
// boom + chime at the reveal, whoosh at the wipe.
export function audioCues() {
  const cues = [];
  // Soft rising whoosh under the wipe-in, so clips that play back to back get a whoosh at both ends of the cut.
  if (settings.audio.whooshIn) cues.push([0, "whooshIn"]);
  for (let k = 0; k < T.segments; k++) {
    cues.push([f(k), k >= T.segments - T.redSeconds ? "tickHigh" : "tick"]);
  }
  cues.push([f(H), "ping"]);
  cues.push([f(H + 0.02), "riser"]);
  cues.push([f(Q), "impact"]);
  cues.push([f(Q), "chime"]);
  cues.push([f(W), "whoosh"]);
  return cues;
}
