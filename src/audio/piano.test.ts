import { describe, expect, it } from 'vitest';
import { nearestSample, SAMPLED_NOTES, sampleName } from './piano';

describe('piano samples', () => {
  it('covers A0 to C8 in minor thirds', () => {
    expect(SAMPLED_NOTES[0]).toBe(21);
    expect(SAMPLED_NOTES.at(-1)).toBe(108);
    expect(SAMPLED_NOTES.map(sampleName).slice(0, 5)).toEqual(['A0', 'C1', 'Ds1', 'Fs1', 'A1']);
    expect(sampleName(60)).toBe('C4');
  });

  it('pitch-shifts the closest sample at most a semitone and a half', () => {
    expect(nearestSample(60)).toEqual({ sample: 60, rate: 1 });
    expect(nearestSample(61)).toEqual({ sample: 60, rate: 2 ** (1 / 12) });
    expect(nearestSample(62)).toEqual({ sample: 63, rate: 2 ** (-1 / 12) });
    for (let m = 21; m <= 108; m++) {
      const { sample } = nearestSample(m);
      expect(SAMPLED_NOTES).toContain(sample);
      expect(Math.abs(m - sample)).toBeLessThanOrEqual(1.5);
    }
  });
});
