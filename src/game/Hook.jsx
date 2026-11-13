import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { G, getCharacter, voDuration, qClipId, hookSeconds } from "./config";
import { Silhouette } from "./Silhouette";

const GOLD = "#FFC83D";
const RED = "#FF4D5E";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" };

// Cold-open hook, played over Round 1 from frame 0 (no logo, no intro card, no greeting). Beat sheet (seconds):
//   0.00  impact + whoosh: a gold streak sweeps across, "50" slams in with a short shake and a ring pulse
//   0.25  "GAMING LEGENDS" slides in next to it
//   0.90  tagline "CAN YOU NAME THEM ALL?" pops in under it (ping)
//   1.20+ three stat chips on the left (rounds / bonus rounds / levels), one ping each
//   1.50  corner teaser: an impossible Expert silhouette + "ONLY 5%" counting up (whoosh), held long enough to read
//   3.40  everything has faded out and Round 1 plays on
// Layout rule: the live silhouette sits in x 780-1780, y 200-1200, so the headline stays above y~420, the chips in the left
// column (x < 700) and the teaser in the bottom-right corner. Nothing covers the middle of the frame while the clock runs.
export const Hook = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const h = G.hook;
  const HS = hookSeconds();
  const sp = (at, cfg = { damping: 12, stiffness: 200 }) => spring({ frame: Math.max(0, Math.round((t - at) * fps)), fps, config: cfg });

  const out = interpolate(t, [HS - 0.35, HS], [1, 0], clamp);
  const slam = spring({ frame, fps, config: { damping: 9, stiffness: 260 } }); // "50"
  const legends = sp(0.25);
  const tag = sp(0.9);
  const shake = t < 0.3 ? Math.sin(t * 90) * 10 * (1 - t / 0.3) : 0;
  const flash = interpolate(t, [0, 0.12], [0.45, 0], clamp);
  const streak = interpolate(t, [0, 0.35], [-0.3, 1.3], clamp); // gold streak position (fraction of width)
  const ring = interpolate(t, [0.02, 0.7], [0, 1], clamp);

  // stat chips (left column)
  const chips = (h.stats || []).map((s, i) => ({ ...s, at: 1.2 + i * 0.2 }));

  // corner teaser
  const tt = t - h.teaserFrom;
  const showTeaser = tt >= 0 && tt <= h.teaserSeconds;
  const teaserIn = sp(h.teaserFrom, { damping: 11, stiffness: 230 });
  const teaserOut = interpolate(tt, [h.teaserSeconds - 0.25, h.teaserSeconds], [1, 0], clamp);
  const pct = Math.round(interpolate(tt, [0.1, 0.6], [0, h.teaserPercent], clamp));
  const pulse = 0.55 + 0.45 * Math.sin(tt * Math.PI * 2 * 2.2);
  const teaserChar = getCharacter(h.teaserRound);

  // SFX duck under the Round 1 question line when a voiceover clip exists
  const duck = voDuration(qClipId(1)) != null || voDuration("intro") != null ? G.voice.duckSfx : 1;
  const at = (s) => Math.round(s * fps);

  return (
    <AbsoluteFill style={{ pointerEvents: "none", fontFamily: "'Big Shoulders Display',Impact,sans-serif" }}>
      {/* top scrim: separates the headline from the round background without hiding the live round */}
      <AbsoluteFill style={{ opacity: out, background: "linear-gradient(180deg, rgba(0,0,0,.72) 0%, rgba(0,0,0,.45) 220px, rgba(0,0,0,0) 520px)" }} />
      {/* gold streak sweep + ring pulse on the slam */}
      <div style={{ position: "absolute", left: `${streak * 100}%`, top: 0, width: 260, height: 520, transform: "translateX(-50%) skewX(-18deg)", background: `linear-gradient(90deg, rgba(255,200,61,0), rgba(255,200,61,.55), rgba(255,200,61,0))`, opacity: out }} />
      <div style={{ position: "absolute", left: 600 - 300 * ring, top: 230 - 300 * ring, width: 600 * ring, height: 600 * ring, borderRadius: "50%", border: `8px solid ${GOLD}`, opacity: (1 - ring) * 0.8 * out }} />

      {t < HS && (
        <div style={{ position: "absolute", left: 0, width: "100%", top: 120, textAlign: "center", opacity: out, transform: `translateX(${shake}px)` }}>
          <div style={{ display: "inline-flex", alignItems: "baseline", gap: 36 }}>
            <span style={{ fontWeight: 900, fontSize: 300, lineHeight: 0.9, color: GOLD, transform: `scale(${(2.2 - 1.2 * slam).toFixed(4)})`, opacity: Math.min(1, slam * 2), textShadow: `0 0 70px ${GOLD}aa, 0 8px 30px rgba(0,0,0,.8)`, display: "inline-block" }}>50</span>
            <span style={{ fontWeight: 900, fontSize: 168, lineHeight: 1, letterSpacing: ".03em", textTransform: "uppercase", color: "#fff", textShadow: "0 6px 28px rgba(0,0,0,.85)", opacity: legends, transform: `translateX(${(1 - legends) * 180}px)`, display: "inline-block" }}>Gaming Legends</span>
          </div>
          <div style={{ marginTop: 4, opacity: tag, transform: `translateY(${(1 - tag) * 24}px) scale(${0.9 + 0.1 * tag})` }}>
            <span style={{ display: "inline-block", padding: "8px 44px", borderRadius: 999, background: "rgba(0,0,0,.62)", border: `3px solid ${GOLD}`, fontWeight: 900, fontSize: 70, letterSpacing: ".1em", textTransform: "uppercase", color: "#fff" }}>Can you name them all?</span>
          </div>
        </div>
      )}

      {/* stat chips, left column */}
      {chips.map((c, i) => {
        const p = sp(c.at, { damping: 12, stiffness: 220 });
        return (
          <div key={i} style={{ position: "absolute", left: 90, top: 330 + i * 150, padding: "14px 34px", borderRadius: 14, border: `3px solid ${GOLD}`, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "baseline", gap: 18, opacity: Math.min(1, p * 1.4) * out, transform: `translateX(${(1 - p) * -160}px)` }}>
            <span style={{ fontWeight: 900, fontSize: 96, lineHeight: 1, color: GOLD }}>{c.n}</span>
            <span style={{ fontWeight: 800, fontSize: 52, lineHeight: 1, letterSpacing: ".1em", textTransform: "uppercase", color: "#fff" }}>{c.label}</span>
          </div>
        );
      })}

      {showTeaser && (
        <div style={{ position: "absolute", right: 90, bottom: 110, width: 520, padding: 24, borderRadius: 18, background: "rgba(8,6,2,.9)", border: `4px solid ${RED}`, boxShadow: `0 0 ${40 + 50 * pulse}px rgba(255,77,94,${(0.4 + 0.3 * pulse).toFixed(2)})`, opacity: teaserOut, transform: `scale(${0.6 + 0.4 * teaserIn}) rotate(${(1 - teaserIn) * 6}deg)`, transformOrigin: "100% 100%", textAlign: "center" }}>
          <div style={{ fontWeight: 900, fontSize: 44, letterSpacing: ".14em", color: RED }}>{"⚠"} ROUND {h.teaserRound}</div>
          <Silhouette char={teaserChar} size={280} style={{ margin: "0 auto" }} />
          <div style={{ marginTop: 4, fontWeight: 900, fontSize: 84, lineHeight: 1, color: "#fff" }}>ONLY <span style={{ color: RED }}>{pct}%</span></div>
          <div style={{ fontWeight: 800, fontSize: 44, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(255,255,255,.9)" }}>get it right</div>
        </div>
      )}

      {flash > 0.001 && <AbsoluteFill style={{ background: `rgba(255,255,255,${flash.toFixed(3)})` }} />}

      {/* sound: slam first (the very first frame already has impact), then a light ping per beat, whoosh into the teaser */}
      <Sequence from={0} layout="none">
        <Audio src={staticFile("sounds/impact.wav")} volume={0.55 * duck} />
        <Audio src={staticFile("sounds/whoosh-in.wav")} volume={0.5 * duck} />
      </Sequence>
      <Sequence from={at(0.25)} durationInFrames={at(0.5)}><Audio src={staticFile("sounds/whoosh.wav")} volume={0.35 * duck} /></Sequence>
      <Sequence from={at(0.9)} durationInFrames={at(0.4)}><Audio src={staticFile("sounds/ping.wav")} volume={0.4 * duck} /></Sequence>
      {chips.map((c, i) => (
        <Sequence key={i} from={at(c.at)} durationInFrames={at(0.4)}><Audio src={staticFile("sounds/ping.wav")} volume={0.3 * duck} /></Sequence>
      ))}
      <Sequence from={at(h.teaserFrom)} durationInFrames={at(1.0)}>
        <Audio src={staticFile("sounds/whoosh.wav")} volume={0.5 * duck} />
        <Audio src={staticFile("sounds/impact.wav")} volume={0.3 * duck} />
      </Sequence>
    </AbsoluteFill>
  );
};
