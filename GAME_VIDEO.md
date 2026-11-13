# Video 02 — Guess the Game Character (50 silhouettes)

Compositions (Remotion Studio): `GameVideo` (full marathon), `GameRound` (one round, prop `roundId`), `GameStinger` (level-up card).

1. Put one transparent PNG per character in `public/game/` (names in `src/game/characters.json` -> `imageFile`).
2. `npm run game:prepare` (reports missing PNGs; missing ones render a placeholder).
3. `npm run game:dev` to preview, `npm run game:render` to render `out/game-quiz.mp4`.

All tuning (timer colours, zoom, tiers, stingers, prompts, hook text, final card) is in `src/game/config.js`.
Tiers/stingers follow the production plan: 1-12 | 13-25 | 26-38 | 39-50, stingers after rounds 12, 25, 38.
Round 50 is unresolved on purpose: post the answer in a pinned comment.
