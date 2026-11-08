# Production process (quiz-matrix-hero-silhouette)

Treat everything here as informed craft, not guaranteed results. Only your own retention graph can say what your audience rewards.

## 1. Reference board + animatic (before polish)
- `npm run still:board` renders 6 stills (frame 0, 0.5 s, question, hint, reveal, fact) for one round of each universe into `out/stills/`.
  Put them side by side: grade, motif, accent and hero-tinted glow should read as three different looks that are still one brand.
- `npm run animatic -- --id 12` renders the timing + soundtrack with all decoration off, plus a timecode / phase label.
  Lock hook timing, hint, riser, reveal hit and CTA timing here.

## 2. Lock sound and timing, then polish
- Timing lives in `settings.json` (`questionSeconds`, `hintAtSeconds`, `revealSeconds`, `hook`, `cta.startSeconds`).
- Sound is `npm run mix` (runs automatically before render). `mix.levels.hookHit` is the thud on frame 0.

## 3. Review
- Frame by frame: Remotion Studio (`npm run dev`) or the animatic label.
- `npm run phone` prints the on-screen size of every type size at phone widths and writes phone-size stills (after `npm run still`).
  Then watch on a real phone at actual size, sound off, then sound on.

## 4. Publish hook variations
- `npm run render:batch -- --hook A`, `--hook B`, `--hook C` (defined in `settings.json -> hook.variants`).
  Output is `out/<id>-<variant>.mp4`, concat gives `out/final-<variant>.mp4`.
- Publish a few, compare the first-seconds retention graph, keep the winner (copy its values into `hook`).

## 5. Opening: teaser shots + A/B teaser sets
- The cold open (`settings.json -> structure.intro.teaserSets`) is three quick shots: an iconic silhouette (live, ticking timer), an eye-only / weapon-only bonus crop (shows the format has variety) and a hard round that looks impossible. A shot is `{ "id": 7, "at": 1.6 }` (round `id` plays live from `at` seconds); `"at": "reveal"` freezes the colour reveal instead.
- Set A: Joker, Killer Frost (eyes only), Etrigan. Set B: Superman, Red Hood (weapon only), The Spectre. `teaserDefault` picks the one used when no flag is given.
- Test: `npm run render:batch -- --teaser B --concat` re-renders only the teaser and writes `out/final-TB.mp4` (rounds are reused). Publish both, compare the first-30-seconds retention, keep the winner by setting `teaserDefault`.
- Sound: the teaser plays `public/sounds/cards/teaser.wav`; the voiceover mix puts the whispered `intro_1` line (suggested text: "Can you name all 50?", under about 1.6 s) at 0.05 s. Keep the first thumbnail frame consistent with shot 1 (a silhouette of the first teaser hero).

## What the template does per clip
- Universe look: `settings.universes` (match on the Universe text): accent, background colours, colour grade, motif
  (halftone = Marvel, comic-panel slashes = DC, speed lines = Anime). A round's own `seriesColor` still wins if you changed it.
- Hero tint: dominant colour of the hero PNG tints the rim light, reveal glow, rays, flare and sparks.
  Override per round with a `heroColor` hex (CSV column or JSON field). The placeholder hero uses the accent colour.
- Type scale: exactly four sizes (`settings.type`: xl 128, l 72, m 44, s 28). Palette: `settings.colors` + the per-universe accent.
- Progress: "12 / 50" tracker with a fill bar (`settings.progress.total`, or a `total` column).
- CTA: the per-clip "How many did you get?" card is OFF in long-video mode (`cta.lastN` 0, `cta.autoLast` false): the ask now lives once in the
  Outro, plus once in the mid-video score check. Set `cta: true` on a single round (or `lastN` > 0) to bring a per-clip card back.
- Wipes (long-video mode, `settings.variety.wipeOnlyBonus`): only bonus rounds wipe in (full navy cover on frame 0) and out. Normal clips are hard cuts,
  and the 0.5 s the wipe used to take is extra hold on the finished reveal / CTA. (Old behaviour: set `variety.enabled` to false.)
- Not colour alone: the last 3 countdown segments are drawn thicker (not just red), the timer bar thickens in the last 1.5 s,
  and the shrinking ring, the number and the heartbeat audio already carry the meaning.

## Bonus rounds (a twist every 10 questions)
Series pattern: 10 questions, BONUS, 10 questions, BONUS ... (50 questions + 5 bonus = 55 clips). Any row with a `type` is a bonus round
(CSV column or JSON field); the build slots them in automatically after every `settings.bonus.every` normal questions, in the order you list them,
and numbers them "BONUS 1 / 5". Give bonus rounds their own ids (the samples use 501-505). The very last clip gets the "How many did you get?" card.

| type | what the viewer sees | useful fields |
|------|----------------------|---------------|
| `eye` | camera stays tight on a coloured spot (the eyes) of the black silhouette, then pulls out on the reveal | `peekX`, `peekY`, `peekR` (percent of the hero box / radius) |
| `weapon` | same, aimed at the weapon / hand | `peekX`, `peekY`, `peekR` |
| `half` | only one half of the silhouette, with a glowing seam; the other half appears on the reveal | `half` = left / right |
| `fake` | two silhouettes A / B, one is a fake; reveal shows REAL / FAKE tags | `decoyFile` (PNG in public/images; empty = the hero mirrored), `realSide` = left / right |
| `blur` | the hero in colour but out of focus, sharpening with the countdown, snaps sharp on the reveal | blur strength in `settings.bonus.types.blur` |

Look and wording of every bonus type live in `settings.json -> bonus` (violet accent + speed lines so a bonus clip is recognisable at a glance).
Eye / weapon spots default to the placeholder hero's proportions; set `peekX` / `peekY` per round for real art.
Images for bonus rows are fetched like any other row (same hero, own id), or drop the PNGs into public/images/<id>.png.

## Variety for long videos (settings.json -> variety, code in src/variation.js)
A 55-clip video repeats the same beats 55 times, so each clip is varied, deterministically (same id = same result, so re-renders match):
- Pre-reveal beats (light flickers, glitch, camera pan + direction, kick) are timed per round from its id; about 25% of clips have no glitch at all.
- Reveal intensity: BIG on bonus rounds, every `milestoneEvery`-th question (10, 20, ...), `bigIds` (1) and the last clip; CALM on the rest
  (shake x0.35, chromatic split x0.45, flash x0.5, softer zoom/pop, 1-frame hit-stop, no second shockwave, no rays, no lens flare, impact sound x0.6).
  Override per round with an `intensity` ("big" / "calm") field in the JSON.
- Picture and sound read the same rules, so the whoosh is only mixed on clips that wipe. `npm run mix` rebuilds automatically.

## Long-video structure (settings.json -> structure): Intro, Score check, Outro
Final order: INTRO (6 s) -> questions (+ bonus rounds) with the SCORE CHECK (4.5 s) right after question 25 -> OUTRO (8 s, the only "How many did you get?" ask,
with score tiers LEGEND / HERO / SIDEKICK / CIVILIAN computed from the real number of clips, then a subscribe line and a fade to dark).
- Intro: title, three rules (they quote `questionSeconds`), "N HEROES / N BONUS ROUNDS" (counted from your series), READY? and a wipe into question 1.
- Score check: "N DONE / N TO GO" progress bar + "How many did you get? Comment your score so far". Wipes in and out like a bonus round.
- Every text, the seconds of each card and `afterQuestion` are in `settings.structure`; set a card's `enabled` to false to drop it.
- `npm run cards` renders only the three cards (out/intro.mp4, recap.mp4, outro.mp4); `npm run still:cards` writes preview stills of them.
- `npm run render:batch -- --concat` renders the cards (once, resume-safe) and joins everything in the right order with per-clip audio lengths. A partial run
  (`--only 12,13`) leaves the cards out; `--no-cards` leaves them out of a full run.
- Card soundtracks: `npm run cardsounds` (also runs before render:batch / dev): the same one-shot sounds + a soft pad, loudness-matched to -14 LUFS like the clips.
- The outro is 8 s with the last 0.6 s fading to dark; keep the lower third free if you add YouTube end-screen elements.

## Reveal simplification + 4 s hold (long-video mode)
- `revealSeconds` is 4.3. Normal clips have no wipe, so the finished reveal (name + fact) stays on screen for 4.8 s; bonus clips get 4.3 s and then wipe. Clip = 11.8 s.
- Impact stack trimmed to: hit (flash, 1-3 frame hit-stop, position shake, colour fringe) -> colour circle + one shockwave ring + sparks -> name -> fact.
  Big reveals keep the light rays; lens flare is off (`reveal.flare` false), the second shockwave is off (`reveal.shock2` false) and the impact camera roll is off
  (`reveal.rollShake` 0). Set those back to true / 1 to restore them.

## Letter-slot hints (settings.json -> letterHints, code in src/letterHints.js)
- One tile per character of the hero's name. The tiles are the same size and in the same spot as the revealed name (128 px type, `tileH` 122, row top 684), so the name stamps in right where the tiles were. Exactly 2 hints fill in, nothing else is revealed:
  - Two-word or hyphenated names (Spider-Man, Iron Man): hint 1 = first letter of the first word, hint 2 = first letter of the last word.
  - Single-word names (Thor, Hulk): hint 1 = first letter, hint 2 = last letter.
  - Hyphens, spaces and dots show from the start. Only that exact position fills in, never every matching letter.
- Timing: tiles rise in at `showAtSeconds` (1.0), hint 1 at `hint1AtSeconds` (3.0, soft ping in the mix), hint 2 at `hint2AtSeconds` (default `hintAtSeconds`, which is where the main ping + riser sit). Tiles leave with the question card at the reveal.
- `skipTypes` lists the bonus types that show no tiles (eye, weapon, fake).
- The text hint card is gone (code and `hint` column are no longer needed; the column is optional now).
- The question ("WHO IS THIS HERO?") is a card on the right, in the same spot as the fact card, with a small label (`text.promptLabel`, bonus rounds show their own label). It slides out as the fact card slides in.
- Peek (body-part flash) is still a separate setting: `peek.enabled`.

### Hint ladder (what the viewer gets, in order)
- 2.0 s flash 1 (body-part peek, `peek.startSeconds`) -> 3.5 s letter 1 (`letterHints.hint1AtSeconds`) -> 4.5 s letter 2 (`hintAtSeconds`, ping + riser) -> 5.4 s flash 2 (`peek.secondFlashAt`), **hard rounds only** (`peek.secondFlashLevels`, levels come from `difficulty.ranges`; remove the setting to flash twice on every round).
- The seeded pattern-interrupt beats in `src/variation.js` (flicker, glitch, pan, kick) are scheduled around these times so nothing fires on top of a hint. Move a hint and re-check those ranges.

## Reveal: answer first, then the fact ("DID YOU KNOW?")
- Two beats. Beat 1: the name stamps in (about 1.2 s) and gets read. Beat 2: the fact card enters at `factCard.appearSeconds` (1.5 s after the reveal) with a soft pop sound (`factCard.cue`, built into the mix).
- Timeline after the reveal (Q = 7 s): 0.0 impact + name stamping -> 0.6 real name -> 1.5 fact card slides in (readable from about 1.8) -> about 3.8 a 6-word fact has been read -> 4.3 end of `revealSeconds` (bonus clips wipe here) -> 4.8 end of clip. Clip = 11.8 s.
- Fact lines live in `questions.json` -> `fact`, label in `text.factLabel`. Budget: **6 words, hard cap 7** (about 2 s of reading). If you lengthen a fact, push `revealSeconds` out by the extra reading time (about 0.35 s per extra word).
- CTA clips (`cta.lastN` is 0, so none by default) hand the card slot to the CTA at `cta.startSeconds` (3.9 s), which leaves the CTA under 1 s; give such a clip its own longer ending.

## 6. Pacing and score checks
- Round ids are play positions (the "N / 50" counter, the voiceover clips `qNN`, the images `N.png` and the CI order all follow the id). The DC series is ordered as: six easy rounds first, then a mix, with hard rounds in runs of at most two and an easy or medium round after each run, and The Spectre as the closing round. To change the order, reorder the rounds and renumber ids and images together.
- The EASY / MEDIUM / HARD badge now comes from each round's own `level` in `questions.json` (the id ranges in `settings.difficulty.ranges` are only a fallback).
- Two score checks: `structure.recap` (after question 25, "How many did you get?") and `structure.recap2` (after question 40, "Beat your score so far!"). Set `structure.recap2.enabled` to `false` to drop the second one. It renders as `out/recap2.mp4`, has its own composition `Recap2`, and its sound is `public/sounds/cards/recap2.wav`. Optional voiceover: a `recap_2` clip in `clips_wav`.
