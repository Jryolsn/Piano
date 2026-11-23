import type { LoopRange } from '../../engine/practice';

/** Shortest loop the user can make. */
export const MIN_LOOP_SECONDS = 2;
/** Length of a loop created without an end point. */
export const DEFAULT_LOOP_SECONDS = 10;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** A new loop starting at `time`. */
export function startLoop(time: number, duration: number): LoopRange {
  const from = clamp(time, 0, Math.max(0, duration - MIN_LOOP_SECONDS));
  return { from, to: Math.min(duration, from + DEFAULT_LOOP_SECONDS) };
}

/** Sets the loop start to `time`, pushing the end along if the loop would get too short. */
export function setLoopFrom(loop: LoopRange | null, time: number, duration: number): LoopRange {
  if (!loop) return startLoop(time, duration);
  const from = clamp(time, 0, Math.max(0, duration - MIN_LOOP_SECONDS));
  return { from, to: Math.min(duration, Math.max(loop.to, from + MIN_LOOP_SECONDS)) };
}

/** Sets the loop end to `time`, pulling the start back if the loop would get too short. */
export function setLoopTo(loop: LoopRange | null, time: number, duration: number): LoopRange {
  const to = clamp(time, Math.min(MIN_LOOP_SECONDS, duration), duration);
  const from = loop ? loop.from : Math.max(0, to - DEFAULT_LOOP_SECONDS);
  return { from: Math.max(0, Math.min(from, to - MIN_LOOP_SECONDS)), to };
}

/** Drags the start handle: it stops at the minimum length before the end. */
export function dragLoopFrom(loop: LoopRange, time: number): LoopRange {
  return { from: clamp(time, 0, Math.max(0, loop.to - MIN_LOOP_SECONDS)), to: loop.to };
}

/** Drags the end handle: it stops at the minimum length after the start. */
export function dragLoopTo(loop: LoopRange, time: number, duration: number): LoopRange {
  return { from: loop.from, to: clamp(time, Math.min(duration, loop.from + MIN_LOOP_SECONDS), duration) };
}
