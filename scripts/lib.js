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
  progress: path.join(__dirname, ".image-progress.json"),
  out: path.join(ROOT, "out"),
  settings: path.join(ROOT, "settings.json"),
};

const COLUMNS = ["id", "universe", "heroName", "realName", "hint", "fact", "imageQuery", "imageFile", "seriesColor", "peekX", "peekY", "peekR", "heroColor", "cta", "total", "type", "decoyFile", "realSide", "half", "level"];

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
    const side = (v) => (/^(left|right)$/i.test(String(v || "").trim()) ? String(v).trim().toLowerCase() : undefined);
    const imageFile = String(r.imageFile || "").trim() || `${id}.png`;
    return {
      id,
      universe: String(r.universe).trim(),
      heroName: String(r.heroName).trim(),
      realName: String(r.realName).trim(),
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
function refreshRounds() {
  const { rounds, source } = readSourceRounds();
  const withImage = rounds.map((r) => ({ ...r, hasImage: fs.existsSync(path.join(P.images, r.imageFile)), ...(r.decoyFile ? { hasDecoy: fs.existsSync(path.join(P.images, r.decoyFile)) } : {}) }));
  fs.writeFileSync(P.rounds, JSON.stringify(withImage, null, 2) + "\n");
  return { rounds: withImage, source };
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

module.exports = { P, COLUMNS, parseCsv, readSourceRounds, refreshRounds, run, has, probeImage, loadProgress, saveProgress, flag, bin, useShell };
