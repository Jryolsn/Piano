import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LOOP_SECONDS,
  dragLoopFrom,
  dragLoopTo,
  MIN_LOOP_SECONDS,
  startLoop,
} from './loop';

const D = 60;

describe('startLoop', () => {
  it('starts at the given time with the default length', () => {
    expect(startLoop(5, D)).toEqual({ from: 5, to: 5 + DEFAULT_LOOP_SECONDS });
  });

  it('stays inside the song near the end', () => {
    expect(startLoop(59, D)).toEqual({ from: D - MIN_LOOP_SECONDS, to: D });
  });
});

describe('dragging pins', () => {
  const loop = { from: 10, to: 20 };

  it('moves freely within limits', () => {
    expect(dragLoopFrom(loop, 12)).toEqual({ from: 12, to: 20 });
    expect(dragLoopTo(loop, 40, D)).toEqual({ from: 10, to: 40 });
  });

  it('stops at the minimum length', () => {
    expect(dragLoopFrom(loop, 25)).toEqual({ from: 20 - MIN_LOOP_SECONDS, to: 20 });
    expect(dragLoopTo(loop, 5, D)).toEqual({ from: 10, to: 10 + MIN_LOOP_SECONDS });
  });

  it('stops at the song edges', () => {
    expect(dragLoopFrom(loop, -5).from).toBe(0);
    expect(dragLoopTo(loop, 99, D).to).toBe(D);
  });
});
