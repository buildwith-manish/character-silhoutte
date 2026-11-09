// Per-round variety for a long video (55 clips back to back):
//   1. Seeded timing of the pre-reveal "pattern interrupts" (flickers, glitch, camera pan, kick), so no two clips repeat the same beats.
//   2. Reveal intensity: "big" (bonus rounds, milestones) or "calm" (everything else).
//   3. Wipe transitions only on bonus rounds; normal clips are plain cuts.
// CommonJS on purpose: it is imported by src/Round.jsx (webpack) AND by scripts/generate-mix.js (node), so picture and sound agree.
// Everything is tunable in settings.json -> "variety". Remove that block (or set enabled:false) to get the old look back.

function mulberry32(a) {
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const seedOf = (id) => (Math.imul(Number(id) + 104729, 2246822519) ^ 0x85ebca6b) >>> 0;

// The original, fixed schedule (used when variety is off).
const LEGACY_JITTER = { flickA: 2.15, glitch: 3.85, flickC: 6.05, kick: 5.6, panStart: 3.0, panDir: 1 };

function varietyFor(round, settings, total) {
  const V = settings.variety || {};
  const legacy = V.enabled !== true;
  const id = Number(round.id);
  const isBonus = Boolean(round.type && round.type !== "normal");

  // ---- intensity: big = full reveal stack, calm = the same reveal with the loud parts turned down ----
  let big;
  if (legacy) big = true;
  else if (round.intensity === "calm") big = false;
  else if (round.intensity === "big") big = true;
  else {
    const every = V.milestoneEvery || 0;
    const bigIds = V.bigIds || [];
    big = isBonus || (every > 0 && id % every === 0) || bigIds.includes(id) || (total > 0 && id === total);
  }
  const C = V.calm || {};
  const fx = big
    ? { big: true, shake: 1, ca: 1, flash: 1, snapZoom: 1, pop: 1, rays: true, flare: settings.reveal.flare !== false, shock2: settings.reveal.shock2 !== false, freezeFrames: settings.reveal.freezeFrames, impact: 1 }
    : {
        big: false,
        shake: C.shake ?? 0.35,
        ca: C.ca ?? 0.45,
        flash: C.flash ?? 0.5,
        snapZoom: C.snapZoom ?? 0.65,
        pop: C.pop ?? 0.7,
        rays: C.rays ?? false,
        flare: C.flare ?? false,
        shock2: C.shock2 ?? false,
        freezeFrames: C.freezeFrames ?? 1,
        impact: C.impact ?? 0.6,
      };

  // ---- wipes: bonus rounds only (a wipe marks "something different is coming") ----
  let wipe = legacy || !V.wipeOnlyBonus || isBonus;
  if (round.wipe === true) wipe = true;
  if (round.wipe === false) wipe = false;

  // ---- seeded pre-reveal beats. Ranges keep every beat clear of the hint ladder (flash 2.0-2.85, letter 3.5, letter 4.5, hard-round flash 5.4-6.1) and the anticipation dip (Q - 0.4 s). ----
  let j = { ...LEGACY_JITTER };
  if (!legacy && V.jitter !== false) {
    const R = mulberry32(seedOf(round.id));
    const u = (a, b) => a + (b - a) * R();
    j = {
      flickA: u(1.2, 1.55), // light flicker, done before flash 1 (2.0 s)
      glitch: u(2.9, 3.05), // in the gap between flash 1 and letter 1 (3.5 s), done by 3.4 s
      flickC: u(4.9, 5.1), // after letter 2 has landed (4.5 s), done before the hard-round flash (5.4 s)
      kick: u(6.1, 6.2), // late push into the anticipation dip, after the flashes
      panStart: u(3.4, 3.8), // slow slide + roll behind letters 1 and 2
      panDir: R() < 0.5 ? -1 : 1,
    };
    if (R() < (V.skipGlitchChance ?? 0.25)) j.glitch = null; // some clips simply have no glitch: the viewer can't count on it
  }

  return { big, fx, wipeIn: wipe, wipeOut: wipe, wipeInFull: !legacy, j };
}

module.exports = { varietyFor };
