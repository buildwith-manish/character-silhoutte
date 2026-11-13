#!/usr/bin/env python3
"""Synthesises the Game Character quiz background music: one seamless 16 s loop per difficulty tier.

public/music/game-easy.wav | game-medium.wav | game-hard.wav | game-expert.wav   (stereo, 44.1 kHz, 16-bit)

All four loops run at 120 BPM so a beat is exactly 0.5 s: the 1 s countdown ticks land on every second beat and the
0.5 s fast ticks of the red phase land on every beat. A 16 s loop = 8 bars = two default 8 s rounds. Pure numpy/scipy,
no samples, no copyright issues. Run:  python3 scripts/generate-game-music.py
"""
import os
import wave

import numpy as np
from scipy.signal import lfilter

SR = 44100
BPM = 120
BEAT = 60.0 / BPM  # 0.5 s
BARS = 8
LOOP = BARS * 4 * BEAT  # 16 s
TAIL = 2.0  # rendered past the end, folded back on the start so the loop is seamless
N = int((LOOP + TAIL) * SR)
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "music")

rng = np.random.default_rng(7)


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


# ---------- oscillators ----------------------------------------------------------------------------------------------
def osc(kind, f, t, duty=0.5):
    return shape(kind, (f * t) % 1.0, duty)


def shape(kind, ph, duty=0.5):
    if kind == "pulse":
        return np.where(ph < duty, 1.0, -1.0)
    if kind == "tri":
        return 4 * np.abs(ph - 0.5) - 1
    if kind == "saw":
        return 2 * ph - 1
    return np.sin(2 * np.pi * ph)


def env(n, a, d, s, r, hold):
    """ADSR over n samples; `hold` = seconds the key is held before release."""
    t = np.arange(n) / SR
    e = np.minimum(t / max(a, 1e-4), 1.0)
    e = np.where(t > a, 1 - (1 - s) * np.minimum((t - a) / max(d, 1e-4), 1.0), e)
    rel = np.clip((t - hold) / max(r, 1e-4), 0, 1)
    return e * (1 - rel)


def lowpass(x, cutoff, order=1):
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = x
    for _ in range(order):
        y = lfilter([1 - a], [1, -a], y)
    return y


def highpass(x, cutoff):
    return x - lowpass(x, cutoff)


class Track:
    def __init__(self):
        self.L = np.zeros(N)
        self.R = np.zeros(N)

    def add(self, sig, start, pan=0.0, gain=1.0):
        i = int(start * SR)
        if i >= N:
            return
        seg = sig[: N - i]
        self.L[i : i + len(seg)] += seg * gain * (1 - max(pan, 0))
        self.R[i : i + len(seg)] += seg * gain * (1 + min(pan, 0))

    def note(self, kind, midi_note, start, dur, gain=0.2, duty=0.5, a=0.005, d=0.08, s=0.6, r=0.06, pan=0.0, vib=0.0, lp=None):
        n = int((dur + r + 0.02) * SR)
        t = np.arange(n) / SR
        f = midi(midi_note) * (1 + vib * np.sin(2 * np.pi * 5.5 * t) * np.minimum(t / 0.3, 1)) if vib else midi(midi_note)
        w = shape(kind, (np.cumsum(f) / SR) % 1.0, duty) if vib else osc(kind, f, t, duty)
        if lp:
            w = lowpass(w, lp)
        self.add(w * env(n, a, d, s, r, dur), start, pan, gain)

    def kick(self, start, gain=0.9, f0=140, f1=48, dur=0.22):
        n = int(dur * SR)
        t = np.arange(n) / SR
        f = f1 + (f0 - f1) * np.exp(-t * 28)
        w = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14)
        w += 0.25 * np.exp(-t * 90) * rng.standard_normal(n)
        self.add(w, start, 0, gain)

    def snare(self, start, gain=0.5, dur=0.2, tone=185):
        n = int(dur * SR)
        t = np.arange(n) / SR
        noise = highpass(rng.standard_normal(n), 1500) * np.exp(-t * 22)
        body = np.sin(2 * np.pi * tone * t) * np.exp(-t * 30) * 0.6
        self.add(noise + body, start, 0.05, gain)

    def hat(self, start, gain=0.18, dur=0.05, pan=0.2):
        n = int(dur * SR)
        t = np.arange(n) / SR
        w = highpass(rng.standard_normal(n), 7000) * np.exp(-t * 90)
        self.add(w, start, pan, gain)

    def clap(self, start, gain=0.4):
        for k, off in enumerate((0, 0.011, 0.022)):
            n = int(0.12 * SR)
            t = np.arange(n) / SR
            w = highpass(lowpass(rng.standard_normal(n), 6000), 900) * np.exp(-t * (30 if k < 2 else 16))
            self.add(w, start + off, -0.05, gain * (0.6 if k < 2 else 1.0))

    def pad(self, notes, start, dur, gain=0.07, lp=1800, kind="saw"):
        n = int((dur + 0.6) * SR)
        t = np.arange(n) / SR
        e = env(n, 0.35, 0.3, 0.8, 0.5, dur)
        for i, m in enumerate(notes):
            f = midi(m)
            w = (osc(kind, f * 1.003, t) + osc(kind, f * 0.997, t)) * 0.5
            self.add(lowpass(w, lp, 2) * e, start, (-0.4, 0.4)[i % 2], gain)

    def fx_delay(self, mix=0.28, time=BEAT * 0.75, fb=0.4, taps=5):
        d = int(time * SR)
        for ch in (self.L, self.R):
            src = ch.copy()
            out = ch.copy()
            g = mix
            for k in range(1, taps + 1):
                out[k * d :] += src[: N - k * d] * g
                g *= fb
            ch[:] = out

    def render(self, peak=0.9):
        L, R = self.L.copy(), self.R.copy()
        L[: int(TAIL * SR)] += L[int(LOOP * SR) :][: int(TAIL * SR)]
        R[: int(TAIL * SR)] += R[int(LOOP * SR) :][: int(TAIL * SR)]
        L, R = L[: int(LOOP * SR)], R[: int(LOOP * SR)]
        # gentle glue: soft clip, then normalise
        L, R = np.tanh(L * 1.2), np.tanh(R * 1.2)
        m = max(np.abs(L).max(), np.abs(R).max())
        return np.stack([L, R], 1) * (peak / m)


def bar(b):
    return b * 4 * BEAT


def beat(b, k):
    return bar(b) + k * BEAT


# ---------- the four tiers ------------------------------------------------------------------------------------------
def easy():
    """EASY (blue): bright, bouncy arcade chiptune in C major. Light drums, catchy pentatonic lead."""
    T = Track()
    chords = [(48, [60, 64, 67]), (43, [59, 62, 67]), (45, [60, 64, 69]), (41, [60, 65, 69])]  # C G Am F
    for p in range(4):
        root, tri = chords[p]
        for b in (p * 2, p * 2 + 1):
            for e in range(8):  # eighth-note bouncing bass
                T.note("tri", root if e % 2 == 0 else root + 12, beat(b, e * 0.5), BEAT * 0.45, gain=0.34, s=0.7, r=0.03)
            for s in range(16):  # sparkly arpeggio
                T.note("pulse", tri[s % 3] + 12 * (s // 3 % 2), beat(b, s * 0.25), BEAT * 0.2, gain=0.07, duty=0.125, r=0.02, pan=-0.35 if s % 2 else 0.35)
            T.kick(beat(b, 0), 0.8)
            T.kick(beat(b, 2), 0.7)
            T.snare(beat(b, 1), 0.28)
            T.snare(beat(b, 3), 0.3)
            for e in range(8):
                T.hat(beat(b, e * 0.5), 0.12 if e % 2 == 0 else 0.07)
    # lead hook (C pentatonic), two-bar phrases, call and response
    hook = [
        (76, 0, 0.5), (79, 0.5, 0.5), (81, 1.0, 1.0), (79, 2.0, 0.5), (76, 2.5, 0.5), (74, 3.0, 1.0),
        (72, 4.0, 0.5), (76, 4.5, 0.5), (79, 5.0, 1.0), (76, 6.0, 0.5), (74, 6.5, 0.5), (72, 7.0, 1.0),
    ]
    for p in range(4):
        shift = (0, 0, 0, -2)[p]
        for m, bt, du in hook:
            if p % 2 == 1 and bt >= 4:
                continue  # leave space in odd phrases
            T.note("pulse", m + shift, bar(p * 2) + bt * BEAT, du * BEAT * 0.9, gain=0.17, duty=0.25, vib=0.004, pan=0.1, r=0.05)
    T.fx_delay(0.22)
    return T.render()


def medium():
    """MEDIUM (purple): moodier A minor groove. Four-on-the-floor, off-beat bass, pad + 16th arpeggios."""
    T = Track()
    chords = [(45, [57, 60, 64]), (41, [57, 60, 65]), (48, [55, 60, 64]), (43, [55, 59, 62])]  # Am F C G
    for p in range(4):
        root, tri = chords[p]
        T.pad(tri + [tri[0] + 12], bar(p * 2), bar(2) - 0.05, gain=0.06, lp=1500)
        for b in (p * 2, p * 2 + 1):
            for k in range(4):
                T.kick(beat(b, k), 0.85)
                T.note("saw", root, beat(b, k + 0.5), BEAT * 0.42, gain=0.2, lp=420, s=0.5, r=0.04)  # off-beat bass
                T.hat(beat(b, k + 0.5), 0.2)
            T.clap(beat(b, 1), 0.38)
            T.clap(beat(b, 3), 0.38)
            order = (0, 1, 2, 1, 0, 2, 1, 2)
            for s in range(16):
                T.note("pulse", tri[order[s % 8] % 3] + 12 + (12 if s % 8 == 7 else 0), beat(b, s * 0.25), BEAT * 0.2, gain=0.075, duty=0.25, r=0.02, pan=0.5 if s % 2 else -0.5)
    melody = [(69, 0, 1.5), (72, 1.5, 0.5), (71, 2, 1), (67, 3, 1), (69, 4, 1.5), (65, 5.5, 0.5), (67, 6, 1), (64, 7, 1)]
    for p in range(4):
        shift = (0, -4, 3, -2)[p]
        for m, bt, du in melody:
            if p == 3 and bt >= 4:
                continue
            T.note("pulse", m + shift, bar(p * 2) + bt * BEAT, du * BEAT * 0.9, gain=0.14, duty=0.25, vib=0.005, pan=-0.1, r=0.06)
    T.fx_delay(0.3)
    return T.render()


def hard():
    """HARD (crimson): driving D minor. 16th-note pulsing bass, hard backbeat, aggressive stabs, constant hats."""
    T = Track()
    chords = [(38, [62, 65, 69]), (34, [62, 65, 70]), (43, [62, 67, 70]), (45, [61, 64, 69])]  # Dm Bb Gm A
    for p in range(4):
        root, tri = chords[p]
        for b in (p * 2, p * 2 + 1):
            for s in range(16):
                T.note("pulse", root + (12 if s % 8 == 6 else 0), beat(b, s * 0.25), BEAT * 0.2, gain=0.26, duty=0.5, lp=900, s=0.6, r=0.02)
                T.hat(beat(b, s * 0.25), 0.15 if s % 4 else 0.22, pan=0.25 if s % 2 else -0.25)
            for k in (0, 1, 2, 3):
                T.kick(beat(b, k), 0.95)
            T.snare(beat(b, 1), 0.5)
            T.snare(beat(b, 3), 0.55)
            T.snare(beat(b, 3.75), 0.28, dur=0.1)
            for st in (0, 0.75, 1.5, 2.5, 3.0):  # syncopated stabs
                for m in tri:
                    T.note("saw", m, beat(b, st), BEAT * 0.2, gain=0.045, a=0.003, d=0.05, s=0.3, r=0.03, lp=3200, pan=0.2)
    lead = [(74, 0, 0.5), (74, 0.75, 0.25), (77, 1, 0.5), (76, 1.5, 0.5), (74, 2, 1), (72, 3, 0.5), (74, 3.5, 0.5),
            (77, 4, 0.5), (77, 4.75, 0.25), (79, 5, 0.5), (77, 5.5, 0.5), (76, 6, 1), (74, 7, 0.5), (73, 7.5, 0.5)]
    for p in range(4):
        shift = (0, -4, 5, 2)[p] if p != 3 else 2
        for m, bt, du in lead:
            T.note("pulse", m + shift - (12 if p == 2 else 0), bar(p * 2) + bt * BEAT, du * BEAT * 0.9, gain=0.12, duty=0.125, vib=0.003, pan=0.05, r=0.04)
    T.fx_delay(0.18, taps=3)
    return T.render()


def expert():
    """EXPERT (gold/obsidian): tense and sparse. Heartbeat kick, low drone pulse, ticking hats, dark pad, icy plucks."""
    T = Track()
    chords = [(40, [52, 55, 59]), (36, [52, 55, 60]), (45, [52, 57, 60]), (47, [51, 54, 59])]  # Em C Am B
    for p in range(4):
        root, tri = chords[p]
        T.pad(tri + [tri[0] + 12, tri[2] + 12], bar(p * 2), bar(2) - 0.05, gain=0.075, lp=1200)
        for b in (p * 2, p * 2 + 1):
            for e in range(8):
                T.note("saw", root, beat(b, e * 0.5), BEAT * 0.4, gain=0.22, lp=260, s=0.7, r=0.04)  # low pulsing drone
            T.kick(beat(b, 0), 0.95, f0=120, f1=42, dur=0.3)  # heartbeat: thump-thump ... thump-thump
            T.kick(beat(b, 0.75), 0.55, f0=120, f1=42, dur=0.25)
            T.kick(beat(b, 2), 0.95, f0=120, f1=42, dur=0.3)
            T.kick(beat(b, 2.75), 0.55, f0=120, f1=42, dur=0.25)
            for e in range(8):
                T.hat(beat(b, e * 0.5), 0.11 if e % 2 else 0.17, dur=0.03, pan=0.3)
            T.snare(beat(b, 3), 0.3, tone=150)
            pat = (0, 2, 1, 2, 0, 1, 2, 1)  # icy plucks
            for s in range(8):
                if (b + s) % 3 == 2:
                    continue
                T.note("pulse", tri[pat[s] % 3] + 24, beat(b, s * 0.5 + 0.25), BEAT * 0.25, gain=0.07, duty=0.125, a=0.002, d=0.1, s=0.1, r=0.05, pan=0.55 if s % 2 else -0.55)
    for p, notes in enumerate(([76, 75, 71], [76, 72, 71], [76, 69, 72], [75, 71, 66])):  # slow ominous lead, one note per bar-pair
        for i, m in enumerate(notes):
            T.note("tri", m, bar(p * 2) + i * 2.5 * BEAT, 2.2 * BEAT, gain=0.2, a=0.04, d=0.2, s=0.7, r=0.2, vib=0.004, pan=-0.1)
    T.fx_delay(0.35, time=BEAT * 0.75, fb=0.5, taps=6)
    return T.render()


TRACKS = {"easy": easy, "medium": medium, "hard": hard, "expert": expert}


def write(path, stereo):
    pcm = (np.clip(stereo, -1, 1) * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for name, fn in TRACKS.items():
        audio = fn()
        p = os.path.join(OUT, f"game-{name}.wav")
        write(p, audio)
        rms = np.sqrt((audio**2).mean())
        print(f"{name:7s} {len(audio)/SR:.2f}s  peak {np.abs(audio).max():.2f}  rms {rms:.3f}  seam jump {np.abs(audio[0]-audio[-1]).max():.3f}")
