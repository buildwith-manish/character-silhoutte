# Character Silhouette — Guess the Character

A Remotion-based quiz video where viewers guess 50 DC characters from their silhouettes, plus 5 bonus rounds (eye / weapon / half / fake / blur). 2560×1440 @ 60 fps, 55 clips, ~12 minutes.

## Structure

- `questions.json` — the 55 characters (50 normal + 5 bonus), their images, hints, and per-round zoom focus points
- `settings.json` — video config: timing, audio mix, bonus round rules, level colors, structure cards
- `voiceover/voiceover-lines.csv` — the per-clip voiceover script (115 clips: 2 intro, 50 question, 50 reveal, 5 bonus question, 5 bonus reveal, 2 recap, 1 outro)
- `voiceover/voiceover-script.md` — the recording script for the voice talent
- `src/` — Remotion React components (Round, Root, timing, etc.)
- `scripts/` — build pipeline (csv-to-json, generate-mix, mix-voiceover, render-batches)
- `public/sounds/` — base SFX (tracked) + generated round/card soundtracks (gitignored)
- `public/images/` — character PNGs (tracked)

## Build

```bash
npm install
npm run csv          # questions.json + rounds.csv → src/rounds.json
npm run mix          # generate per-round soundtracks
npm run vo           # mix voiceover clips from clips_wav/ (if present)
npm run render:batch # render all clips to out/
```

See `PROCESS.md` for the full production process.

## Backups

After each finished video:

1. **Commit everything** — make sure all content changes (`questions.json`, `settings.json`, `voiceover/`, `VIDEO_LOG.md`) are committed:
   ```bash
   git add -A
   git commit -m "Finish video 01: <title>"
   ```
2. **Create an annotated git tag** named `video-NN-final` (zero-padded, e.g. `video-01-final`):
   ```bash
   git tag -a video-01-final -m "Video 01 final: Guess the Character — 50 DC Heroes"
   ```
   Or use the helper: `./tag-video 01`
3. **Push the branch and the tag**:
   ```bash
   git push origin main
   git push origin video-01-final
   ```
4. **Add a row to `VIDEO_LOG.md`** with the video number, title, date rendered, voice provider and plan, voice name, model, git tag name, backup zip location, and monetization status.

The `tag-video` helper script automates steps 1–3:
```bash
./tag-video 01    # commits, tags as video-01-final, pushes branch + tag
```

Large generated files (rendered `.mp4`s, the `out/` folder, `clips_wav/`, mixed soundtracks) are gitignored — back them up separately (Google Drive, NAS, etc.) and record the location in `VIDEO_LOG.md`.

## Render & upload (GitHub Actions)

1. **Actions -> Render Video (parallel) -> Run workflow.** It splits the composition (default `GameVideo`) into up to 40 frame-range chunks, renders them in parallel (video only), renders the audio once, then joins them without re-encoding. Download the result from the run's **Artifacts** (named after `video_name`). Use `test_frames` for a quick test render.
2. **Actions -> Upload Video to YouTube -> Run workflow.** Enter the render run ID (the number in the run's URL), the same `video_name`, a title, description and privacy. Nothing uploads automatically after a render.

Upload secrets (Settings -> Secrets and variables -> Actions): `YOUTUBE_CLIENT_SECRET` (the whole `client_secret.json`) and `YOUTUBE_REFRESH_TOKEN`.
