import { describe, expect, it } from 'vitest';
import type { Note } from '../song/model';
import { isBlack, keyRangeFor, layoutKeys } from './keyboard';

const note = (midi: number): Note => ({ midi, time: 0, duration: 1, hand: 'right' });

describe('isBlack', () => {
  it('identifies black keys', () => {
    expect([60, 61, 62, 63, 64, 65, 66].map(isBlack)).toEqual([false, true, false, true, false, false, true]);
  });
});

describe('keyRangeFor', () => {
  it('rounds to whole octaves', () => {
    expect(keyRangeFor([note(50), note(74)])).toEqual({ low: 48, high: 83 });
  });

  it('widens to the minimum number of octaves', () => {
    const r = keyRangeFor([note(60), note(64)]);
    expect((r.high - r.low + 1) / 12).toBe(2);
    expect(r.low).toBeLessThanOrEqual(60);
    expect(r.high).toBeGreaterThanOrEqual(64);
  });

  it('clamps to the piano', () => {
    expect(keyRangeFor([note(21), note(108)])).toEqual({ low: 21, high: 108 });
  });

  it('has a sensible default for an empty song', () => {
    expect(keyRangeFor([])).toEqual({ low: 48, high: 71 });
  });
});

describe('layoutKeys', () => {
  const keys = layoutKeys({ low: 60, high: 71 }, 700);

  it('splits the width over the white keys', () => {
    const whites = keys.filter((k) => !k.black);
    expect(whites).toHaveLength(7);
    expect(whites[6]!.x + whites[6]!.width).toBeCloseTo(700);
  });

  it('places black keys between white keys and after them in order', () => {
    const cSharp = keys.find((k) => k.midi === 61)!;
    expect(cSharp.x + cSharp.width / 2).toBeCloseTo(100);
    expect(keys.indexOf(cSharp)).toBeGreaterThan(6);
  });
});
