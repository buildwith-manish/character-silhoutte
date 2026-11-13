#!/usr/bin/env python3
"""Cut the bonus-round art (white background + ground shadow) out into transparent PNGs in public/game/bonus/.

Usage: python3 scripts/cutout-bonus.py <source-dir>
Background = near-white (and, where `shadow` is set, low-saturation grey) pixels connected to the image border, so enclosed
whites (eye whites, teeth) stay. Tiny stray marks (e.g. a signature) are dropped; the result is cropped to the artwork.
"""
import sys, os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

SRC = sys.argv[1] if len(sys.argv) > 1 else "."
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "game", "bonus")

# name -> (source file, white threshold, shadow-by-saturation, cut everything below this fraction of the height, extra keep-ratio)
JOBS = {
    "n64-controller": ("8f103ee5-cee5-4792-99e6-8732552889c2.png", 244, False, None),
    "pac-man":        ("lucid-origin_Same_art_style_for_the_whole_set_polished_official_mobile_console_game_art_bold_-0_7_.jpg", 238, False, 0.80),
    "angry-face":     ("lucid-origin_Same_art_style_for_the_whole_set_polished_official_mobile_console_game_art_bold_-0_6_.jpg", 238, False, 0.865),
    "angry-bird":     ("lucid-origin_Same_art_style_for_the_whole_set_polished_official_mobile_console_game_art_bold_-0_5_.jpg", 238, True, None),
    "donkey-kong":    ("lucid-origin_Same_art_style_for_the_whole_set_polished_official_mobile_console_game_art_bold_-0_2_.jpg", 238, True, None),
    "pig":            ("lucid-origin_Same_art_style_for_the_whole_set_polished_official_mobile_console_game_art_bold_-0_1_.jpg", 238, True, None),
}

HOLES = {"donkey-kong"}

def cutout(name, fname, white, shadow, cut):
    im = np.asarray(Image.open(os.path.join(SRC, fname)).convert("RGB")).astype(np.int16)
    h, w, _ = im.shape
    mn, mx = im.min(2), im.max(2)
    cand = mn >= white
    if shadow:
        cand |= ((mx - mn) < 26) & (mx > 150)
    if cut:
        cand[int(h * cut):, :] = True
    lab, n = ndi.label(cand)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    if cut:  # the forced-background strip must count as outside
        border |= set(np.unique(lab[-1])) - {0}
    bg = np.isin(lab, list(border))
    if name in HOLES:  # large enclosed gaps (e.g. between DK's arms and torso) are background too
        sizes_c = ndi.sum(cand, lab, range(1, n + 1))
        cy = ndi.center_of_mass(cand, lab, range(1, n + 1))
        big = [i + 1 for i, sz in enumerate(sizes_c) if sz > 1500 and cy[i][0] > 0.4 * h]  # below the face, so teeth stay
        bg |= np.isin(lab, big)
    fg = ~bg
    # drop stray specks (signatures etc.), keep real separate parts such as smoke puffs
    fl, fn = ndi.label(fg)
    sizes = ndi.sum(fg, fl, range(1, fn + 1))
    keep = [i + 1 for i, s in enumerate(sizes) if s >= 0.004 * sizes.max()]
    fg = np.isin(fl, keep)
    # soft edge: erode 1 px (kills the white halo), then feather
    core = ndi.binary_erosion(fg, iterations=1)
    alpha = ndi.gaussian_filter(core.astype(np.float32), 0.9)
    alpha = np.clip((alpha - 0.15) / 0.7, 0, 1)
    rgba = np.dstack([im.clip(0, 255).astype(np.uint8), (alpha * 255).astype(np.uint8)])
    ys, xs = np.where(alpha > 0.05)
    pad = 6
    box = (max(0, xs.min() - pad), max(0, ys.min() - pad), min(w, xs.max() + pad + 1), min(h, ys.max() + pad + 1))
    img = Image.fromarray(rgba, "RGBA").crop(box)
    img.thumbnail((1000, 1000), Image.LANCZOS)
    os.makedirs(OUT, exist_ok=True)
    img.save(os.path.join(OUT, name + ".png"), optimize=True)
    print(name, img.size)

for k, (f, white, shadow, cut) in JOBS.items():
    cutout(k, f, white, shadow, cut)
