import React from "react";
import { Composition, Series } from "remotion";
import { Round } from "./Round";
import { Intro, Recap, Outro, cardFrames } from "./Cards";
import { T } from "./timing";
import settings from "../settings.json";
import rounds from "./rounds.json";

// 2560x1440 @ 60 fps. "Round" = one quiz clip; Intro / Recap / Outro = the long-video structure cards (settings.json -> structure).
const base = { fps: T.fps, width: 2560, height: 1440 };

// The recap card sits after a specific question (settings.structure.recap.afterQuestion).
// In rounds.json the bonus rounds are interleaved every 10 questions, so the Nth *normal* question
// is not at index N. We find the index of the normal round whose id == afterQuestion.
const recapAfter = ((settings.structure || {}).recap || {}).afterQuestion || 25;
const recapIdx = rounds.findIndex((r) => Number(r.id) === Number(recapAfter) && (!r.type || r.type === "normal"));
const recapAfterIndex = recapIdx >= 0 ? recapIdx : Math.floor(rounds.length / 2);

// FullVideo: plays the whole video back-to-back (Intro → all rounds → Recap after Q25 → Outro).
// Motion blur is OFF so the Studio preview stays smooth. Use this composition to scrub the full timeline.
const FullVideo = () => (
  <Series>
    <Series.Sequence durationInFrames={cardFrames("intro", 6)}>
      <Intro />
    </Series.Sequence>
    {rounds.map((r, i) => (
      <React.Fragment key={r.id}>
        <Series.Sequence durationInFrames={T.totalFrames}>
          <Round roundId={r.id} motionBlur={false} />
        </Series.Sequence>
        {i === recapAfterIndex ? (
          <Series.Sequence durationInFrames={cardFrames("recap", 4.5)}>
            <Recap />
          </Series.Sequence>
        ) : null}
      </React.Fragment>
    ))}
    <Series.Sequence durationInFrames={cardFrames("outro", 8)}>
      <Outro />
    </Series.Sequence>
  </Series>
);

// Total duration: intro + (rounds × 11s) + recap + outro, all in frames
const fullVideoFrames =
  cardFrames("intro", 6) +
  rounds.length * T.totalFrames +
  cardFrames("recap", 4.5) +
  cardFrames("outro", 8);

export const RemotionRoot = () => (
  <>
    <Composition id="Round" component={Round} durationInFrames={T.totalFrames} {...base} defaultProps={{ roundId: rounds.length ? rounds[0].id : 12 }} />
    <Composition id="FullVideo" component={FullVideo} durationInFrames={fullVideoFrames} {...base} />
    <Composition id="Intro" component={Intro} durationInFrames={cardFrames("intro", 6)} {...base} />
    <Composition id="Recap" component={Recap} durationInFrames={cardFrames("recap", 4.5)} {...base} />
    <Composition id="Outro" component={Outro} durationInFrames={cardFrames("outro", 8)} {...base} />
  </>
);
