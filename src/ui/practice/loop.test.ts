import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LOOP_SECONDS,
  dragLoopFrom,
  dragLoopTo,
  MIN_LOOP_SECONDS,
  setLoopFrom,
  setLoopTo,
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

describe('setLoopFrom / setLoopTo', () => {
  it('keeps the other end when the loop stays long enough', () => {
    expect(setLoopFrom({ from: 5, to: 30 }, 10, D)).toEqual({ from: 10, to: 30 });
    expect(setLoopTo({ from: 5, to: 30 }, 20, D)).toEqual({ from: 5, to: 20 });
  });

  it('pushes or pulls the other end to keep the minimum length', () => {
    expect(setLoopFrom({ from: 5, to: 30 }, 29, D)).toEqual({ from: 29, to: 31 });
    expect(setLoopTo({ from: 5, to: 30 }, 6, D)).toEqual({ from: 4, to: 6 });
  });

  it('makes a loop ending here when there is none', () => {
    expect(setLoopTo(null, 30, D)).toEqual({ from: 20, to: 30 });
    expect(setLoopTo(null, 3, D)).toEqual({ from: 0, to: 3 });
  });
});

describe('dragging handles', () => {
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
