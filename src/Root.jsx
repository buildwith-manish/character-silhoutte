import React from "react";
import { Composition } from "remotion";
import { Round } from "./Round";
import { Intro, Recap, Outro, cardFrames } from "./Cards";
import { T } from "./timing";
import rounds from "./rounds.json";

// 2560x1440 @ 60 fps. "Round" = one quiz clip; Intro / Recap / Outro = the long-video structure cards (settings.json -> structure).
const base = { fps: T.fps, width: 2560, height: 1440 };
export const RemotionRoot = () => (
  <>
    <Composition id="Round" component={Round} durationInFrames={T.totalFrames} {...base} defaultProps={{ roundId: rounds.length ? rounds[0].id : 12 }} />
    <Composition id="Intro" component={Intro} durationInFrames={cardFrames("intro", 6)} {...base} />
    <Composition id="Recap" component={Recap} durationInFrames={cardFrames("recap", 4.5)} {...base} />
    <Composition id="Outro" component={Outro} durationInFrames={cardFrames("outro", 8)} {...base} />
  </>
);
