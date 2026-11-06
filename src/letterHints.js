// Letter-slot hints: one tile per character of the hero's name. How many tiles are revealed depends on the name length, so short
// names are not given away (Thor with 2 of 4 letters shown is 50% revealed).
//
//   Letters in the name (spaces, hyphens, dots and digits' punctuation are not counted):
//     1-3 letters  -> 1 hint: the first letter
//     4 letters    -> 1 hint: a MIDDLE letter (the 2nd), never the first. T_OR / T__R would nearly give "Thor" away.
//     5 letters    -> 1 hint: the first letter
//     6+ letters   -> 2 hints, as before:
//        Two-word or hyphenated names (Spider-Man, Iron Man, Black Panther):
//          hint 1 = first letter of the FIRST word, hint 2 = first letter of the LAST word.
//        Single-word names (Thanos, Wolverine):
//          hint 1 = first letter, hint 2 = last letter.
//
// Hyphens, spaces, dots and other punctuation are shown from the start. Only the exact position of a hint fills in,
// never every matching letter (Spider-Man hint 2 fills the M, it does not touch the other letters).
const ALNUM = /[\p{L}\p{N}]/u;
const SHORT_MAX = 5; // names with this many letters or fewer only get one hint

export function buildSlots(name) {
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

  // short names: a single hint. 4 letters -> the 2nd letter (a middle one); everything else short -> the first letter.
  if (n <= SHORT_MAX) {
    const one = n === 4 ? letterIdx[1] : letterIdx[0];
    slots[one].hint = 1;
    return slots;
  }

  const h1 = words[0].start;
  let h2 = words.length > 1 ? words[words.length - 1].start : words[0].end;
  if (h2 === h1) h2 = -1; // only one hint exists
  slots[h1].hint = 1;
  if (h2 >= 0) slots[h2].hint = 2;
  return slots;
}
