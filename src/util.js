import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cancelRender, continueRender, delayRender, staticFile } from "remotion";

// "Question #{n} • {universe}" -> "Question #12 • Marvel Universe"
export const fillTemplate = (tpl, vars) =>
  String(tpl).replace(/\{(\w+)\}/g, (_, k) => (vars[k] == null ? "" : String(vars[k])));

export const findRound = (rounds, id) => rounds.find((r) => String(r.id) === String(id));

const FONT_FILES = [
  { family: "Big Shoulders Display", weight: "700", file: "fonts/big-shoulders-display-latin-700-normal.woff2" },
  { family: "Big Shoulders Display", weight: "800", file: "fonts/big-shoulders-display-latin-800-normal.woff2" },
  { family: "Big Shoulders Display", weight: "900", file: "fonts/big-shoulders-display-latin-900-normal.woff2" },
  { family: "Manrope", weight: "500", file: "fonts/manrope-latin-500-normal.woff2" },
  { family: "Manrope", weight: "700", file: "fonts/manrope-latin-700-normal.woff2" },
];

// Local fonts from public/fonts, no network. Holds the render until every face is loaded.
export function useFonts() {
  const [handle] = useState(() => delayRender("Loading local fonts"));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    Promise.all(
      FONT_FILES.map((f) => {
        const face = new FontFace(f.family, `url(${staticFile(f.file)}) format("woff2")`, {
          weight: f.weight,
          style: "normal",
        });
        return face.load().then((loaded) => document.fonts.add(loaded));
      })
    )
      .then(() => {
        setReady(true);
        continueRender(handle);
      })
      .catch((err) => cancelRender(err));
  }, [handle]);
  return ready;
}

// Shrinks the font of the element in `ref` (from `max` down to `min`, `step` px at a time) until fits(el) is true.
// Runs once the local fonts are ready and re-runs when `key` (the text) changes. Holds the render until it is done,
// so a rendered frame never shows an unfitted size. Short text keeps `max`, so normal rounds look exactly as designed.
export function useFit(ref, ready, key, { max, min, step = 2, fits }) {
  const [size, setSize] = useState(max);
  const [handle] = useState(() => delayRender("Fitting text"));
  const done = useRef(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!ready || !el) return;
    let s = max;
    el.style.fontSize = `${s}px`;
    while (s > min && !fits(el)) {
      s -= step;
      el.style.fontSize = `${s}px`;
    }
    setSize(s);
    if (!done.current) {
      done.current = true;
      continueRender(handle);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, key]);
  return size;
}

// Holds the render until an image is decoded (used for the CSS mask on the light sweep).
export function usePreloadImage(src) {
  const [handle] = useState(() => (src ? delayRender(`Preloading ${src}`) : null));
  useEffect(() => {
    if (!src || handle == null) return;
    const img = new Image();
    img.onload = () => continueRender(handle);
    img.onerror = () => cancelRender(new Error(`Could not load ${src}`));
    img.src = src;
  }, [src, handle]);
}

// ---- colour helpers ---------------------------------------------------------------------------------------------------
export const hexToRgb = (hex) => {
  const h = String(hex || "").replace("#", "").trim();
  const f = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(f, 16);
  return Number.isFinite(n) && f.length === 6 ? [(n >> 16) & 255, (n >> 8) & 255, n & 255] : [255, 181, 61];
};
export const mixRgb = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));

// Universe look from settings.universes. "match" is a whole-word, case-insensitive match against the round's universe text
// ("Marvel Universe" -> marvel, "DC Universe" -> dc, "Anime Heroes" -> anime). Returns null if nothing matches.
export const lookFor = (universes, name) => {
  const n = String(name || "");
  const key = Object.keys(universes || {}).find((k) => new RegExp(`\\b${universes[k].match || k}\\b`, "i").test(n));
  return key ? { key, ...universes[key] } : null;
};

// Accent colour: the round's own seriesColor wins when the author changed it; otherwise the universe accent; otherwise the default.
export const pickAccent = (seriesColor, defaultSeries, look) =>
  seriesColor && String(seriesColor).toLowerCase() !== String(defaultSeries).toLowerCase() ? seriesColor : (look && look.accent) || defaultSeries;

// Dominant colour of the hero PNG (saturation-weighted average of the opaque pixels), used to tint the rim light and the reveal glow.
// Holds the render until sampled. Falls back to `fallback` ([r,g,b]) for the placeholder hero, grey heroes or any error.
export function useHeroColor(src, fallback) {
  const [handle] = useState(() => (src ? delayRender("Sampling hero colour") : null));
  const [rgb, setRgb] = useState(fallback);
  useEffect(() => {
    if (!src || handle == null) return;
    const img = new Image();
    img.onload = () => {
      try {
        const w = 64, h = Math.max(1, Math.round((64 * img.naturalHeight) / img.naturalWidth));
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        const ctx = c.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, w, h);
        const d = ctx.getImageData(0, 0, w, h).data;
        let r = 0, g = 0, b = 0, wt = 0, sat = 0, n = 0;
        for (let i = 0; i < d.length; i += 4) {
          const a = d[i + 3] / 255;
          if (a < 0.8) continue;
          const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
          const s = mx ? (mx - mn) / mx : 0;
          const k = (0.04 + s * s) * (mx > 30 ? 1 : 0.1);
          r += d[i] * k; g += d[i + 1] * k; b += d[i + 2] * k; wt += k; sat += s; n++;
        }
        if (wt > 0 && n > 0 && sat / n > 0.14) {
          const m = Math.max(r, g, b) / wt;
          const boost = m < 215 ? 215 / m : 1; // keep the glow bright enough to read on the dark stage
          setRgb([r, g, b].map((v) => Math.min(255, Math.round((v / wt) * boost))));
        }
      } catch (e) { /* keep fallback */ }
      continueRender(handle);
    };
    img.onerror = () => continueRender(handle);
    img.src = src;
  }, [src, handle]);
  return rgb;
}
