import React from "react";
import { Sequence, Series } from "remotion";
import { GameRound } from "./GameRound";
import { Hook } from "./Hook";
import { CHARACTERS, G, roundFrames } from "./config";

export const gameVideoFrames = G.total * roundFrames;

// The whole marathon back to back. No intro card: Round 1 is on screen at 0:00 with the hook overlay on top.
export const GameVideo = () => (
  <>
    <Series>
      {CHARACTERS.slice(0, G.total).map((c) => (
        <Series.Sequence key={c.id} durationInFrames={roundFrames}>
          <GameRound roundId={c.id} />
        </Series.Sequence>
      ))}
    </Series>
    <Sequence from={0} durationInFrames={Math.round(G.hook.headlineSeconds * G.fps) + 1}>
      <Hook />
    </Sequence>
  </>
);
