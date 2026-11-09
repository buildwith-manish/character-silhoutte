import React from "react";

// Per-universe background motif, drawn inside the (slowest) background layer so it parallaxes with the camera.
//   halftone : comic print dots, drifting, strongest toward the corners        (Marvel)
//   panels   : bold diagonal comic-panel slashes + a darker panel wedge          (DC)
//   speed    : radiating manga speed lines that re-roll at 12 fps (stepped, on purpose)   (Anime)
const rnd = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

const BOX = { position: "absolute", left: -200, top: -200, width: 2000, height: 1300, pointerEvents: "none" };

export const Motif = ({ kind, t, color, opacity = 0.2, vis = 1, cx = 800, cy = 400 }) => {
  const o = Number((opacity * Math.max(0, Math.min(1, vis))).toFixed(3));
  if (!kind || o <= 0.004) return null;

  if (kind === "halftone") {
    const mask = "radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 28%, #000 90%)";
    return (
      <div
        style={{
          ...BOX, opacity: o, transform: "rotate(-14deg)", WebkitMaskImage: mask, maskImage: mask,
          backgroundImage: `radial-gradient(circle, ${color} 0 2.8px, rgba(0,0,0,0) 3.4px)`,
          backgroundSize: "26px 26px", backgroundPosition: `${((t * 9) % 26).toFixed(1)}px ${((t * 5) % 26).toFixed(1)}px`,
        }}
      />
    );
  }

  if (kind === "panels") {
    const slash = (x0, x1, w, i) => {
      const dx = 16 * Math.sin(t * 0.45 + i * 1.7);
      return `${x0 + dx},-200 ${x0 + w + dx},-200 ${x1 + w + dx},1100 ${x1 + dx},1100`;
    };
    return (
      <svg width="2000" height="1300" viewBox="-200 -200 2000 1300" style={{ ...BOX, opacity: o }} aria-hidden="true">
        <polygon points={`${-200 + 10 * Math.sin(t * 0.3)},-200 520,-200 140,1100 -200,1100`} fill={color} opacity="0.35" />
        <polygon points={slash(560, 180, 14, 0)} fill={color} />
        <polygon points={slash(1010, 640, 26, 1)} fill={color} opacity="0.8" />
        <polygon points={slash(1380, 1010, 10, 2)} fill={color} opacity="0.65" />
        <polygon points={slash(1700, 1330, 40, 3)} fill={color} opacity="0.5" />
      </svg>
    );
  }

  if (kind === "speed") {
    const step = Math.floor(t * 12); // stepped re-roll = hand-drawn feel
    const N = 64, lines = [];
    for (let i = 0; i < N; i++) {
      const sd = i + step * 7.31;
      if (rnd(sd + 1) < 0.28) continue;
      const a = (i / N) * Math.PI * 2 + (rnd(sd + 2) - 0.5) * 0.08 + t * 0.015;
      const r0 = 250 + rnd(sd + 3) * 260, r1 = 1250 + rnd(sd + 4) * 300, wd = 0.006 + rnd(sd + 5) * 0.02;
      const P = (r, da) => `${(cx + Math.cos(a + da) * r).toFixed(1)},${(cy + Math.sin(a + da) * r).toFixed(1)}`;
      lines.push(<polygon key={i} points={`${P(r0, -0.0015)} ${P(r1, -wd)} ${P(r1, wd)} ${P(r0, 0.0015)}`} fill={rnd(sd + 6) < 0.18 ? color : "#fff"} opacity={(0.45 + rnd(sd + 7) * 0.55).toFixed(2)} />);
    }
    return <svg width="2000" height="1300" viewBox="-200 -200 2000 1300" style={{ ...BOX, opacity: o }} aria-hidden="true">{lines}</svg>;
  }
  return null;
};
