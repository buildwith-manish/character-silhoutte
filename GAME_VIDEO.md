# Video 02 — Guess the Game Character (50 silhouettes)

Compositions (Remotion Studio): `GameVideo` (full marathon), `GameRound` (one round, prop `roundId`), `GameStinger` (level-up card).

1. Put one transparent PNG (prompts + rules: `public/game/IMAGE_PROMPTS.md`) per character in `public/game/` (names in `src/game/characters.json` -> `imageFile`).
2. `npm run game:prepare` (reports missing PNGs; missing ones render a placeholder).
3. `npm run game:dev` to preview, `npm run game:render` to render `out/game-quiz.mp4`.

All tuning (timer colours, zoom, tiers, stingers, prompts, hook text, final card) is in `src/game/config.js`.
Tiers/stingers follow the production plan: 1-12 | 13-25 | 26-38 | 39-50, stingers after rounds 12, 25, 38.
Round 50 is unresolved on purpose: post the answer in a pinned comment.

## Voiceover (step 7)

The voiceover lives in `clips.7z` (repo root, 115 WAVs; text in `voiceover/lines.csv`). Nothing to unpack by hand:

1. `npm run game:prepare` (also run automatically by `game:dev` / `game:render`) unpacks `clips.7z` into `clips_game/` when that folder is empty
   (needs a `7z` binary or `pip install py7zr`), measures every clip and copies them to `public/game-vo/` (both git-ignored). Names may or may not
   carry an `NNN_` prefix.
2. `npm run game:render` -> `out/game-quiz.mp4` with voiceover mixed in.

Clip ids: `g01..g50_question|reveal`, `stinger_1..3`, `bonus_{emoji,versus,controller,myth,cheat}_{question,reveal}`, `intro`, `outro`.

How it plays: the question line is read first, the timer bar pops and ticking starts right after it ends; the reveal line plays at the reveal and the reveal
stretches automatically if the line is longer than the default 2 s. Stingers stretch the same way. Bonus clips: the question line plays over the splash
(splash stretches to fit), the reveal line plays at the reveal (reveal stretches to fit). Round 1: the `intro` line plays over the hook, the timer pops when it
ends and the Round 1 question line plays over the timer. Round 50: the reveal line plays over the end card, followed by the `outro` line.
Missing clips fall back to the fixed timing, so you can add voiceover gradually. Timings/ducking are in `src/game/config.js -> voice`.
