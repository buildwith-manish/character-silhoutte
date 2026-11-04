// GSAP Pattern 1: GSAP only supplies easing math as pure functions.
// Remotion renders frames; there are no gsap.to / gsap.timeline calls anywhere.
import { gsap } from "gsap";

const make = (name) => {
  const fn = gsap.parseEase(name);
  return (t) => fn(t);
};

// The four eases named in the brief
export const backOut = make("back.out(1.7)"); // slide-ins
export const expoOut = make("expo.out"); // reveals
export const elasticOut = make("elastic.out(1, 0.5)"); // stamps
export const power3Out = make("power3.out"); // fades

// Exact GSAP equivalents of the curves used by the reference HTML preview
// (cubic out, quintic out, cubic in-out, classic back-out with 1.70158 overshoot).
export const power2Out = make("power2.out");
export const power4Out = make("power4.out");
export const power2InOut = make("power2.inOut");
export const backOutClassic = make("back.out(1.70158)");

export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, x) => a + (b - a) * x;

// prog(frame, start, end) -> 0..1, clamped. Unit-agnostic: pass frames or seconds.
export const prog = (frame, start, end) => clamp((frame - start) / (end - start), 0, 1);

// tween(frame, start, end, from, to, ease) -> eased value between from and to.
export const tween = (frame, start, end, from, to, ease = (x) => x) =>
  from + (to - from) * ease(prog(frame, start, end));
