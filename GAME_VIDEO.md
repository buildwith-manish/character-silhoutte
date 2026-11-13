# Video 02 — Guess the Game Character (50 silhouettes)

Compositions (Remotion Studio): `GameVideo` (full marathon), `GameRound` (one round, prop `roundId`), `GameStinger` (level-up card).

1. Put one transparent PNG (prompts + rules: `public/game/IMAGE_PROMPTS.md`) per character in `public/game/` (names in `src/game/characters.json` -> `imageFile`).
2. `npm run game:prepare` (reports missing PNGs; missing ones render a placeholder).
3. `npm run game:dev` to preview, `npm run game:render` to render `out/game-quiz.mp4`.

All tuning (timer colours, zoom, tiers, stingers, prompts, hook text, final card) is in `src/game/config.js`.
Tiers/stingers follow the production plan: 1-12 | 13-25 | 26-38 | 39-50, stingers after rounds 12, 25, 38.
Round 50 is unresolved on purpose: post the answer in a pinned comment.

## Voiceover (step 7)

1. Record/generate the lines in `voiceover/game-voiceover-lines.csv` (50 question, 50 reveal, 3 stinger; Round 50's reveal line is read over the end card).
2. Put the WAVs in `clips_game/` keeping the `NNN_<clip_id>.wav` names (e.g. `003_g02_question.wav`, `101_stinger_1.wav`).
3. `npm run game:prepare` measures them and copies them to `public/game-vo/` (git-ignored). It warns about question clips longer than ~2.7 s.

How it plays: the question line is read first, the timer bar pops and ticking starts right after it ends; the reveal line plays at the reveal and the reveal
stretches automatically if the line is longer than the default 2 s. Stinger and Round 50 end card stretch the same way. Missing clips fall back to the
fixed timing, so you can add voiceover gradually. Round 1 is the exception by design (`voice.overlapRounds`): the timer runs from 0:00 and the question line
plays over it, to keep the cold-open hook. Timings/ducking are in `src/game/config.js -> voice`.
