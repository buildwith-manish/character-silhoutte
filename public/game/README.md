# Game character silhouettes

Drop one transparent-background PNG per character here, named exactly like `imageFile` in `src/game/characters.json`
(e.g. `mario.png`, `sonic-the-hedgehog.png`, `hornet.png`). The video renders them as pure black silhouettes
(`brightness(0)`) and crossfades to the full-colour PNG at the reveal. Missing files fall back to a placeholder.
Run `npm run game:prepare` after adding files.
