// Shared helpers for the pipeline scripts. No absolute paths, no secrets.
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const P = {
  root: ROOT,
  csv: path.join(ROOT, "rounds.csv"),
  json: path.join(ROOT, "questions.json"),
  rounds: path.join(ROOT, "src", "rounds.json"),
  images: path.join(ROOT, "public", "images"),
  clipsWav: path.join(ROOT, "clips_wav"), // voiceover clips (extracted from clips_wav.7z); see scripts/mix-voiceover.py
  progress: path.join(__dirname, ".image-progress.json"),
  out: path.join(ROOT, "out"),
  settings: path.join(ROOT, "settings.json"),
};

// Voiceover clip placement (mirrors scripts/mix-voiceover.py: Q_DELAY = 0.5, R_DELAY = 7.3).
// These are the start times, in seconds, of the question and reveal clips inside each round soundtrack.
const VO_Q_START = 0.5;
const VO_R_START = 7.3;

const COLUMNS = ["id", "universe", "heroName", "realName", "hint", "fact", "imageQuery", "imageFile", "seriesColor", "peekX", "peekY", "peekR", "heroColor", "cta", "total", "type", "decoyFile", "realSide", "half", "level", "role", "hintPositions"];

function parseCsv(text) {
  text = text.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== "")) rows.push(row);
  if (!rows.length) return [];
  const head = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? "").trim()])));
}

// Reads rounds.csv if present, otherwise questions.json. Returns normalized rounds.
function readSourceRounds() {
  let raw, source;
  if (fs.existsSync(P.csv)) { raw = parseCsv(fs.readFileSync(P.csv, "utf8")); source = "rounds.csv"; }
  else if (fs.existsSync(P.json)) { raw = JSON.parse(fs.readFileSync(P.json, "utf8")); source = "questions.json"; }
  else throw new Error("No rounds.csv or questions.json found in the project root.");
  const settings = JSON.parse(fs.readFileSync(P.settings, "utf8"));
  const seen = new Set();
  const BONUS_TYPES = ["eye", "weapon", "half", "fake", "blur"];
  const ROLES = ["hero", "superhero", "superheroine", "villain", "supervillain", "antihero"];
  const mapped = raw.map((r, idx) => {
    for (const k of ["id", "universe", "heroName", "realName", "fact"]) {
      if (r[k] == null || String(r[k]).trim() === "") throw new Error(`${source}: row ${idx + 1} is missing "${k}"`);
    }
    const id = Number(r.id);
    if (!Number.isFinite(id)) throw new Error(`${source}: row ${idx + 1} has a non-numeric id "${r.id}"`);
    if (seen.has(id)) throw new Error(`${source}: duplicate id ${id}`);
    seen.add(id);
    const type = String(r.type || "").trim().toLowerCase();
    if (type && type !== "normal" && !BONUS_TYPES.includes(type)) throw new Error(`${source}: row ${idx + 1} has an unknown type "${r.type}" (use ${BONUS_TYPES.join(" | ")} or leave empty)`);
    const role = String(r.role || "").trim().toLowerCase();
    if (role && !ROLES.includes(role)) throw new Error(`${source}: row ${idx + 1} has an unknown role "${r.role}" (use ${ROLES.join(" | ")} or leave empty)`);
    // optional hint override: 1-based LETTER positions to reveal (max 2). JSON: [3] or [1, 4]. CSV: "3" or "1 4".
    const hintPositions = (Array.isArray(r.hintPositions) ? r.hintPositions : String(r.hintPositions ?? "").split(/[\s,;|]+/))
      .map((v) => Number(v)).filter((v) => Number.isInteger(v) && v >= 1).slice(0, 2);
    const side = (v) => (/^(left|right)$/i.test(String(v || "").trim()) ? String(v).trim().toLowerCase() : undefined);
    const imageFile = String(r.imageFile || "").trim() || `${id}.png`;
    return {
      id,
      universe: String(r.universe).trim(),
      heroName: String(r.heroName).trim(),
      realName: String(r.realName).trim(),
      // who the character is: category tag shown with the real name at the reveal (settings.text.roleLabels). The question prompt is the same for every role.
      ...(role ? { role } : {}),
      ...(hintPositions.length ? { hintPositions } : {}),
      hint: String(r.hint || "").trim(), // optional and unused: the letter-slot tiles replaced the text hint card
      fact: String(r.fact).trim(),
      imageQuery: String(r.imageQuery || "").trim() || `${String(r.heroName).trim()} ${String(r.universe).trim()}`,
      imageFile,
      seriesColor: String(r.seriesColor || "").trim() || settings.colors.series,
      // bonus round format (eye | weapon | half | fake | blur), see settings.json -> bonus. Empty = normal question.
      ...(type && type !== "normal" ? { type } : {}),
      ...(String(r.decoyFile || "").trim() ? { decoyFile: String(r.decoyFile).trim() } : {}), // "fake" round: the fake hero's PNG (empty = the hero mirrored)
      ...(side(r.realSide) ? { realSide: side(r.realSide) } : {}), // "fake" round: which side the real hero is on (empty = alternates by id)
      ...(side(r.half) ? { half: side(r.half) } : {}), // "half" round: which half is shown (empty = alternates by id)
      // optional: hex override for the rim/glow tint (empty = sampled from the PNG), CTA end card on this clip, series total for the "12 / 50" tracker
      ...(/^#?[0-9a-f]{6}$/i.test(String(r.heroColor || "").trim()) ? { heroColor: "#" + String(r.heroColor).trim().replace("#", "") } : {}),
      ...(/^(1|true|yes|y)$/i.test(String(r.cta === undefined ? "" : r.cta).trim()) ? { cta: true } : {}),
      ...(Number.isFinite(Number(r.total)) && String(r.total ?? "").trim() !== "" ? { total: Number(r.total) } : {}),
      // optional visual-hint spot (percent of the hero box: x 0-100 left->right, y 0-100 top->bottom; radius in px). Empty = settings.peek defaults.
      ...Object.fromEntries(["peekX", "peekY", "peekR"].map((k) => [k, r[k] !== undefined && String(r[k]).trim() !== "" && Number.isFinite(Number(r[k])) ? Number(r[k]) : undefined]).filter(([, v]) => v !== undefined)),
      // optional difficulty level (easy / medium / hard). Defaults: ids 1-15 easy, 16-35 medium, 36-50 hard.
      ...(["easy", "medium", "hard"].includes(String(r.level || "").trim().toLowerCase()) ? { level: String(r.level).trim().toLowerCase() } : (() => {
        const nid = Number(r.id);
        if (nid >= 1 && nid <= 15) return { level: "easy" };
        if (nid >= 16 && nid <= 35) return { level: "medium" };
        if (nid >= 36 && nid <= 50) return { level: "hard" };
        return {};
      })()),
    };
  });
  // Series order: a bonus round (any row with a type) is slotted in after every `settings.bonus.every` normal questions
  // (10 questions, bonus, 10 questions, bonus ...). Bonus rows keep their own order; leftovers go to the end.
  const normal = mapped.filter((r) => !r.type), bonus = mapped.filter((r) => r.type);
  const every = settings.bonus && settings.bonus.every > 0 ? settings.bonus.every : 0;
  let rounds = mapped;
  if (every && bonus.length) {
    rounds = [];
    let bi = 0;
    normal.forEach((r, i) => { rounds.push(r); if ((i + 1) % every === 0 && bi < bonus.length) rounds.push(bonus[bi++]); });
    while (bi < bonus.length) rounds.push(bonus[bi++]);
  }
  bonus.forEach((r, i) => { r.bonusNo = i + 1; r.bonusTotal = bonus.length; });
  if (settings.cta && settings.cta.enabled && settings.cta.autoLast !== false && rounds.length) rounds[rounds.length - 1].cta = true; // end card on the very last clip
  return { rounds, source };
}

// Writes src/rounds.json (git-ignored). hasImage tells Round.jsx whether to use the PNG or the placeholder hero.
// Voiceover clip durations from clips_wav/ are attached per round as voQuestionEnd / voRevealEnd
// (seconds, round-relative; see VO_Q_START / VO_R_START). A field is left out when the clip is missing,
// so Round.jsx and generate-mix.js fall back to today's default timing for that round. Loud non-fatal
// warnings (warnVoiceoverTiming) are emitted for question clips past 3 s and reveal clips past the wipe.
function refreshRounds() {
  const { rounds, source } = readSourceRounds();
  const clips = loadVoiceoverDurations();
  const withImage = rounds.map((r) => ({
    ...r,
    hasImage: fs.existsSync(path.join(P.images, r.imageFile)),
    ...(r.decoyFile ? { hasDecoy: fs.existsSync(path.join(P.images, r.decoyFile)) } : {}),
    ...voTimesFor(r.id, clips),
  }));
  fs.writeFileSync(P.rounds, JSON.stringify(withImage, null, 2) + "\n");
  if (Object.keys(clips).length) warnVoiceoverTiming(withImage, clips);
  return { rounds: withImage, source, clips };
}

// Windows needs the .cmd shims for npm-installed CLIs.
const bin = (name) => (process.platform === "win32" && ["npx", "z-ai"].includes(name) ? `${name}.cmd` : name);
const useShell = process.platform === "win32";

function run(cmd, args, opts = {}) {
  return spawnSync(bin(cmd), args, { encoding: "utf8", shell: useShell, cwd: ROOT, maxBuffer: 64 * 1024 * 1024, ...opts });
}

function has(cmd, versionArg = "-version") {
  const r = run(cmd, [versionArg]);
  return !r.error && r.status === 0;
}

const ALPHA_FORMATS = /^(rgba|bgra|argb|abgr|ya8|ya16|yuva|gbrap|rgba64|bgra64|pal8)/;

// Returns { width, height, pixFmt, hasAlpha } or null when the file is unreadable.
// pal8 is treated as "may have alpha": a palette PNG can carry transparency and ffprobe cannot tell.
function probeImage(file) {
  if (!fs.existsSync(file)) return null;
  const r = run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,pix_fmt", "-of", "json", file]);
  if (r.error || r.status !== 0) return null;
  try {
    const s = JSON.parse(r.stdout).streams[0];
    return { width: s.width, height: s.height, pixFmt: s.pix_fmt, hasAlpha: ALPHA_FORMATS.test(s.pix_fmt || "") };
  } catch { return null; }
}

// Measures the duration (seconds) of an audio file with ffprobe. Returns null when the file is
// missing or unreadable. WAV files are read directly (no ffprobe dependency), mirroring
// guess-the-word's scripts/voiceover-scan.js; everything else falls back to ffprobe.
function probeAudioSeconds(file) {
  if (!fs.existsSync(file)) return null;
  if (/\.wav$/i.test(file)) {
    try {
      const b = fs.readFileSync(file);
      if (b.length >= 44 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WAVE") {
        let pos = 12, byteRate = 0;
        while (pos + 8 <= b.length) {
          const id = b.toString("ascii", pos, pos + 4);
          const size = b.readUInt32LE(pos + 4);
          if (id === "fmt ") byteRate = b.readUInt32LE(pos + 16);
          if (id === "data" && byteRate) return Math.min(size, b.length - pos - 8) / byteRate;
          pos += 8 + size + (size % 2);
        }
      }
    } catch { /* fall through to ffprobe */ }
  }
  const r = run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file]);
  if (r.error || r.status !== 0) return null;
  const v = parseFloat(String(r.stdout || "").trim().split(/\s+/).pop());
  return Number.isFinite(v) ? v : null;
}

// Builds a lookup of voiceover clip durations keyed by clip id, matching scripts/mix-voiceover.py's
// load_clips() keying exactly: the filename is `NNN_<id>.wav` (the NNN_ prefix is the line number from
// the whisper notebook), and the key is `<id>` (everything after the first underscore). So
// `4_q01_question.wav` -> key `q01_question`, `12_b501_reveal.wav` -> key `b501_reveal`. Files without
// an underscore (unlikely) are skipped, same as mix-voiceover.py. Returns {} when clips_wav/ is missing
// (the build then keeps today's default timing, same as mix-voiceover.py).
function loadVoiceoverDurations() {
  const clips = {};
  if (!fs.existsSync(P.clipsWav) || !fs.statSync(P.clipsWav).isDirectory()) return clips;
  for (const name of fs.readdirSync(P.clipsWav)) {
    if (!/\.wav$/i.test(name)) continue;
    const base = name.replace(/\.wav$/i, "");
    const idx = base.indexOf("_");
    if (idx < 0) continue; // no underscore -> skip (mirrors mix-voiceover.py's `len(parts) == 2` check)
    const id = base.slice(idx + 1); // strip the leading NNN_ prefix -> the clip id
    const s = probeAudioSeconds(path.join(P.clipsWav, name));
    if (s != null) clips[id] = Math.round(s * 1000) / 1000;
  }
  return clips;
}

// Resolves the per-round voiceover clip ids for a given round id, matching SCRIPT_ORDER in mix-voiceover.py:
//   1..50   -> qNN_question / qNN_reveal    (zero-padded to 2 digits)
//   501..   -> bNNN_question / bNNN_reveal  (no zero padding; "b" + the round id as-is)
function voClipIdsFor(roundId) {
  const id = Number(roundId);
  if (id >= 500) {
    return { q: `b${id}_question`, r: `b${id}_reveal` };
  }
  return { q: `q${String(id).padStart(2, "0")}_question`, r: `q${String(id).padStart(2, "0")}_reveal` };
}

// Returns { voQuestionEnd, voRevealEnd } for a round, leaving a field out when its clip is missing
// (Round.jsx and generate-mix.js then keep today's default timing for that field). Times are in seconds,
// round-relative: voQuestionEnd = VO_Q_START + question clip length, voRevealEnd = VO_R_START + reveal clip length.
function voTimesFor(roundId, clips) {
  const ids = voClipIdsFor(roundId);
  const out = {};
  const qDur = clips[ids.q];
  if (qDur != null) out.voQuestionEnd = Math.round((VO_Q_START + qDur) * 1000) / 1000;
  const rDur = clips[ids.r];
  if (rDur != null) out.voRevealEnd = Math.round((VO_R_START + rDur) * 1000) / 1000;
  return out;
}

// Warns (loudly, but never throws) about voiceover clips whose timing fights the round:
//   - a question clip that ends after VO_WARN_QUESTION_END (3 s): the question is being spoken past the
//     3 s voDelay cap, so the countdown ring / tracker / bar entrance is clamped and the question line
//     overlaps the start of the countdown.
//   - a reveal clip that runs past the wipe (VO_R_START + clip length > questionSeconds + revealSeconds):
//     the reveal line is cut off by the wipe-out at the end of the clip.
// Rounds without a clip for that phase are skipped (no warning, default timing). The build never fails;
// this only prints to stderr so it shows up in `npm run csv` / `npm run mix` / CI logs.
function warnVoiceoverTiming(rounds, clips) {
  const settings = JSON.parse(fs.readFileSync(P.settings, "utf8"));
  const W = Number(settings.questionSeconds) + Number(settings.revealSeconds); // wipe starts at W (= 11.3 s by default)
  const VO_WARN_QUESTION_END = 3; // a question line longer than this trips the 3 s voDelay cap
  const warnings = [];
  for (const r of rounds) {
    const ids = voClipIdsFor(r.id);
    const { voQuestionEnd, voRevealEnd } = voTimesFor(r.id, clips);
    if (voQuestionEnd != null && voQuestionEnd > VO_WARN_QUESTION_END) {
      const qDur = clips[ids.q];
      warnings.push({
        round: r.id,
        hero: r.heroName,
        clip: ids.q,
        kind: "question-too-long",
        message: `round ${r.id} (${r.heroName || "?"}): question clip "${ids.q}.wav" is ${qDur.toFixed(2)} s long (ends at ${voQuestionEnd.toFixed(2)} s, past the ${VO_WARN_QUESTION_END} s voDelay cap) — shorten it to ~1.5 s, or the countdown ring / tracker / bar will be clamped and overlap the spoken question.`,
      });
    }
    if (voRevealEnd != null && voRevealEnd > W) {
      const rDur = clips[ids.r];
      warnings.push({
        round: r.id,
        hero: r.heroName,
        clip: ids.r,
        kind: "reveal-overrun",
        message: `round ${r.id} (${r.heroName || "?"}): reveal clip "${ids.r}.wav" is ${rDur.toFixed(2)} s long (ends at ${voRevealEnd.toFixed(2)} s, past the wipe at ${W.toFixed(2)} s) — shorten it or lengthen revealSeconds, or the reveal line will be cut off by the wipe-out.`,
      });
    }
  }
  if (warnings.length) {
    const line = "=".repeat(78);
    console.error(`\n${line}\n⚠  VOICEOVER TIMING WARNING${warnings.length > 1 ? "S" : ""} (${warnings.length}) — build continues, but fix these for clean playback\n${line}`);
    for (const w of warnings) console.error(`  ! ${w.message}`);
    console.error(`${line}\n`);
  }
  return warnings;
}

function loadProgress() {
  try { return JSON.parse(fs.readFileSync(P.progress, "utf8")); } catch { return {}; }
}
function saveProgress(p) {
  fs.writeFileSync(P.progress, JSON.stringify(p, null, 2));
}

function flag(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = process.argv[i + 1];
  return v === undefined || v.startsWith("--") ? true : v;
}

module.exports = {
  P,
  COLUMNS,
  VO_Q_START,
  VO_R_START,
  parseCsv,
  readSourceRounds,
  refreshRounds,
  run,
  has,
  probeImage,
  probeAudioSeconds,
  loadVoiceoverDurations,
  voClipIdsFor,
  voTimesFor,
  warnVoiceoverTiming,
  loadProgress,
  saveProgress,
  flag,
  bin,
  useShell,
};
