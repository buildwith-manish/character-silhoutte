import React from "react";
import { Sequence, Series } from "remotion";
import { GameRound } from "./GameRound";
import { BonusRound } from "./BonusRound";
import { Hook } from "./Hook";
import { Stinger } from "./Stinger";
import { MusicBed } from "./MusicBed";
import { G, SEGMENTS, totalVideoFrames } from "./config";

export const gameVideoFrames = totalVideoFrames;

// The whole marathon back to back, in the order given by config SEGMENTS: rounds, the bonus clips (config.bonus) that follow
// their round, and the 1-second level-up stingers after rounds 12, 25 and 38.
// No intro card: Round 1 is on screen at 0:00 with the hook overlay on top.
export const GameVideo = () => (
  <>
    <Series>
      {SEGMENTS.map((s) => (
        <Series.Sequence key={`${s.kind}-${s.id ?? s.index}`} durationInFrames={s.frames}>
          {s.kind === "round" ? <GameRound roundId={s.id} /> : s.kind === "bonus" ? <BonusRound index={s.index} /> : <Stinger index={s.index} />}
        </Series.Sequence>
      ))}
    </Series>
    <MusicBed />
    <Sequence from={0} durationInFrames={Math.round(G.hook.headlineSeconds * G.fps) + 1}>
      <Hook />
    </Sequence>
  </>
);
