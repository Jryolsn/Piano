import { describe, expect, it } from 'vitest';
import { findPeaks } from './spectrum';

const SAMPLE_RATE = 48000;
const BINS = 4096;
const BIN_HZ = SAMPLE_RATE / 2 / BINS;

function spectrumWith(peaks: { hz: number; db: number }[]): Float32Array {
  const s = new Float32Array(BINS).fill(-100);
  for (const { hz, db } of peaks) {
    const i = Math.round(hz / BIN_HZ);
    s[i] = db;
    s[i - 1] = db - 6;
    s[i + 1] = db - 6;
  }
  return s;
}

describe('findPeaks', () => {
  it('returns prominent peaks strongest first', () => {
    const peaks = findPeaks(spectrumWith([{ hz: 440, db: -30 }, { hz: 261.6, db: -20 }]), SAMPLE_RATE);
    expect(peaks).toHaveLength(2);
    expect(peaks[0]!.frequency).toBeCloseTo(261.6, -1);
    expect(peaks[1]!.frequency).toBeCloseTo(440, -1);
  });

  it('ignores peaks below the prominence threshold', () => {
    expect(findPeaks(spectrumWith([{ hz: 440, db: -90 }]), SAMPLE_RATE)).toEqual([]);
  });

  it('ignores peaks outside the frequency range', () => {
    expect(findPeaks(spectrumWith([{ hz: 8000, db: -20 }]), SAMPLE_RATE)).toEqual([]);
  });
});
