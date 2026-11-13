# Game character silhouettes

Drop one transparent-background PNG per character here, named exactly like `imageFile` in `src/game/characters.json`
(e.g. `mario.png`, `sonic-the-hedgehog.png`, `hornet.png`). The video renders them as pure black silhouettes
(`brightness(0)`) and crossfades to the full-colour PNG at the reveal. Missing files fall back to a placeholder.
Run `npm run game:prepare` after adding files.

## Bonus-round art (`public/game/bonus/`)

Transparent PNGs used by bonus rounds 1-3 (no emojis): `angry-bird`, `angry-face`, `pig` (Emoji Decoder), `donkey-kong`, `pac-man`
(Who Came First?) and `n64-controller` (Name That Console, rendered black then crossfaded to colour). To swap one, drop the new
white-background render into a folder, edit the filename in `scripts/cutout-bonus.py`, and run `python3 scripts/cutout-bonus.py <folder>`.
