#!/usr/bin/env python3
"""Generates the 8-bit button beeps used by the Cheat Code bonus (public/sounds/beep-<button>.wav).
Run: python3 scripts/generate-beeps.py"""
import math, struct, wave, os

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "sounds")
NOTES = {"u": 784.0, "d": 523.25, "l": 587.33, "r": 659.25, "b": 880.0, "a": 987.77}  # one pitch per button
DUR = 0.18

os.makedirs(OUT, exist_ok=True)
for key, f in NOTES.items():
    n = int(SR * DUR)
    frames = bytearray()
    for i in range(n):
        t = i / SR
        sq = 1.0 if math.sin(2 * math.pi * f * t) >= 0 else -1.0
        env = min(1.0, t / 0.004) * math.exp(-t * 14)
        frames += struct.pack("<h", int(sq * env * 0.34 * 32767))
    with wave.open(os.path.join(OUT, f"beep-{key}.wav"), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(bytes(frames))
print("wrote", len(NOTES), "beeps")
