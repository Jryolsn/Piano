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

/** Drags the start pin: it stops at the minimum length before the end. */
export function dragLoopFrom(loop: LoopRange, time: number): LoopRange {
  return { from: clamp(time, 0, Math.max(0, loop.to - MIN_LOOP_SECONDS)), to: loop.to };
}

/** Drags the end pin: it stops at the minimum length after the start. */
export function dragLoopTo(loop: LoopRange, time: number, duration: number): LoopRange {
  return { from: loop.from, to: clamp(time, Math.min(duration, loop.from + MIN_LOOP_SECONDS), duration) };
}
