// Letter-slot hints: one tile per character of the hero's name, two of them are revealed as hints.
//
//   Two-word or hyphenated names (Spider-Man, Iron Man, Black Panther):
//     hint 1 = first letter of the FIRST word, hint 2 = first letter of the LAST word.
//   Single-word names (Thor, Hulk, Thanos):
//     hint 1 = first letter, hint 2 = last letter.
//
// Hyphens, spaces, dots and other punctuation are shown from the start. Only the exact position of a hint fills in,
// never every matching letter (Spider-Man hint 2 fills the M, it does not touch the other letters).
const ALNUM = /[\p{L}\p{N}]/u;

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

  const h1 = words[0].start;
  let h2 = words.length > 1 ? words[words.length - 1].start : words[0].end;
  if (h2 === h1) h2 = -1; // one-letter name: only one hint exists
  slots[h1].hint = 1;
  if (h2 >= 0) slots[h2].hint = 2;
  return slots;
}
