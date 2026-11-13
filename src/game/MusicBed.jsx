import React from "react";
import { Audio, Sequence, interpolate, staticFile } from "remotion";
import { CHARACTERS, G, framesFor, stingerAfter, stingerFramesFor } from "./config";

// Splits the marathon into one music segment per tier. A segment starts where its tier is announced (the level-up
// stinger before it) and ends at the next stinger, so the loop switch is hidden under the stinger whoosh/impact.
export const musicSegments = () => {
  const segs = [];
  let f = 0;
  let cur = { key: G.tiers[0].key, from: 0 };
  CHARACTERS.slice(0, G.total).forEach((c) => {
    f += framesFor(c.id);
    const st = stingerAfter(c.id);
    if (st) {
      segs.push({ ...cur, frames: f - cur.from });
      cur = { key: st.next, from: f };
      f += stingerFramesFor(G.stingers.indexOf(st));
    }
  });
  segs.push({ ...cur, frames: f - cur.from });
  return segs;
};

export const MusicBed = () => {
  const M = G.music;
  if (!M || !M.enabled) return null;
  const segs = musicSegments();
  const fade = Math.max(1, Math.round(M.fadeSeconds * G.fps));
  const endFade = Math.max(1, Math.round(M.endFadeSeconds * G.fps));
  return (
    <>
      {segs.map((s, i) => {
        const last = i === segs.length - 1;
        const first = i === 0;
        const volume = (f) => {
          const fin = first ? 1 : interpolate(f, [0, fade], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const out = interpolate(f, [s.frames - (last ? endFade : fade), s.frames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return M.volume * fin * out;
        };
        return (
          <Sequence key={`${s.key}-${s.from}`} from={s.from} durationInFrames={s.frames}>
            <Audio src={staticFile(M.files[s.key])} loop volume={volume} />
          </Sequence>
        );
      })}
    </>
  );
};
