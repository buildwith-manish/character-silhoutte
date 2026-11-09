// Letter-slot hints: one tile per character of the hero's name. How many tiles are revealed is capped by a PERCENTAGE of the
// name's letters (settings.letterHints.maxRatio, default 0.34), so short names are not given away (Thor with 2 of 4 letters
// shown is 50% revealed). At most 2 hints exist (hint 1 / hint 2 timings in settings.letterHints).
//
//   count = clamp(floor(letters * maxRatio), 1, 2)       letters = alphanumeric characters only
//   count 1: first letter, except 4-letter names which show the 2nd letter (T_OR / T__R would nearly give "Thor" away)
//   count 2: two-word or hyphenated names -> first letter of the FIRST word + first letter of the LAST word (Spider-Man: S, M)
//            single-word names            -> first letter + last letter
//
// Per-question override: a `hintPositions` array in questions.json (1-based, counting LETTERS only, so spaces and hyphens do not
// count): [3] reveals the 3rd letter only, [1, 4] reveals letters 1 and 4. Up to 2 positions; it beats the ratio rule.
//
// Hyphens, spaces, dots and other punctuation are shown from the start. Only the exact position of a hint fills in,
// never every matching letter (Spider-Man hint 2 fills the M, it does not touch the other letters).
const ALNUM = /[\p{L}\p{N}]/u;
const DEFAULT_RATIO = 0.34;

export function buildSlots(name, opts = {}) {
  const chars = Array.from(String(name || "").toUpperCase());
  const slots = chars.map((ch) => ({ ch, letter: ALNUM.test(ch), hint: 0 }));

  // words = runs of letters / digits, so spaces, hyphens and dots all split words
  const words = [];
  let cur = null;
  chars.forEach((ch, i) => {
    if (ALNUM.test(ch)) {
      if (!cur) {
        cur = { start: i, end: i };
        words.push(cur);
      }
      cur.end = i;
    } else {
      cur = null;
    }
  });
  if (!words.length) return slots;

  const letterIdx = [];
  slots.forEach((sl, i) => { if (sl.letter) letterIdx.push(i); });
  const n = letterIdx.length;

  // explicit per-question positions win over the ratio rule
  const manual = (Array.isArray(opts.positions) ? opts.positions : [])
    .map((p) => letterIdx[Number(p) - 1])
    .filter((i, k, arr) => i !== undefined && arr.indexOf(i) === k)
    .slice(0, 2);
  if (manual.length) {
    manual.forEach((i, k) => { slots[i].hint = k + 1; });
    return slots;
  }

  const ratio = Number.isFinite(Number(opts.maxRatio)) && Number(opts.maxRatio) > 0 ? Number(opts.maxRatio) : DEFAULT_RATIO;
  const count = Math.min(2, Math.max(1, Math.floor(n * ratio)));
  if (count === 1) {
    slots[n === 4 ? letterIdx[1] : letterIdx[0]].hint = 1;
    return slots;
  }

  const h1 = words[0].start;
  let h2 = words.length > 1 ? words[words.length - 1].start : words[0].end;
  if (h2 === h1) h2 = -1; // only one hint exists
  slots[h1].hint = 1;
  if (h2 >= 0) slots[h2].hint = 2;
  return slots;
}
