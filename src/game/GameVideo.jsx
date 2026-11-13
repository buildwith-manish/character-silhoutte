import React from "react";
import { Sequence, Series } from "remotion";
import { GameRound } from "./GameRound";
import { Hook } from "./Hook";
import { Stinger } from "./Stinger";
import { MusicBed } from "./MusicBed";
import { CHARACTERS, G, framesFor, stingerAfter, stingerFramesFor } from "./config";

export const gameVideoFrames = CHARACTERS.slice(0, G.total).reduce((n, c) => n + framesFor(c.id), 0) + G.stingers.reduce((n, _, i) => n + stingerFramesFor(i), 0);

// The whole marathon back to back. No intro card: Round 1 is on screen at 0:00 with the hook overlay on top.
// A 1-second level-up stinger follows rounds 12, 25 and 38 (config.stingers).
export const GameVideo = () => (
  <>
    <Series>
      {CHARACTERS.slice(0, G.total).map((c) => {
        const st = stingerAfter(c.id);
        return (
          <React.Fragment key={c.id}>
            <Series.Sequence durationInFrames={framesFor(c.id)}>
              <GameRound roundId={c.id} />
            </Series.Sequence>
            {st ? (
              <Series.Sequence durationInFrames={stingerFramesFor(G.stingers.indexOf(st))}>
                <Stinger index={G.stingers.indexOf(st)} />
              </Series.Sequence>
            ) : null}
          </React.Fragment>
        );
      })}
    </Series>
    <MusicBed />
    <Sequence from={0} durationInFrames={Math.round(G.hook.headlineSeconds * G.fps) + 1}>
      <Hook />
    </Sequence>
  </>
);
