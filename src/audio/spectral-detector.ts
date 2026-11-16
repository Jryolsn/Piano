import type { DetectionResult, Detector } from './detector';
import { spectrumDb } from './fft';
import { midiToFrequency } from './pitch';
import { median } from './spectrum';

export interface SpectralDetectorOptions {
  /** How far a partial must rise above the spectrum's median level. */
  minProminenceDb?: number;
  /** A partial must also be within this many dB of the loudest bin (rejects window leakage). */
  maxBelowPeakDb?: number;
  /** Frames quieter than this (RMS, dBFS) never match. */
  minLevelDb?: number;
  /** Search tolerance around each partial, in cents. */
  toleranceCents?: number;
}

/**
 * Checks for energy at each expected note's partials. A note counts as present when its
 * fundamental stands out, or both its 2nd and 3rd harmonics do (weak fundamentals of low
 * notes on phone mics). The second rule rejects the note an octave above, whose partials
 * only line up with even harmonics.
 */
export class SpectralDetector implements Detector {
  private readonly minProminenceDb: number;
  private readonly maxBelowPeakDb: number;
  private readonly minLevelDb: number;
  private readonly toleranceCents: number;

  constructor({
    minProminenceDb = 20,
    maxBelowPeakDb = 30,
    minLevelDb = -60,
    toleranceCents = 50,
  }: SpectralDetectorOptions = {}) {
    this.minProminenceDb = minProminenceDb;
    this.maxBelowPeakDb = maxBelowPeakDb;
    this.minLevelDb = minLevelDb;
    this.toleranceCents = toleranceCents;
  }

  detect(frame: Float32Array, sampleRate: number, expectedMidi: readonly number[]): DetectionResult {
    if (expectedMidi.length === 0 || levelDb(frame) < this.minLevelDb) return { match: false, confidence: 0 };

    const spectrum = spectrumDb(frame);
    const binHz = sampleRate / frame.length;
    const floor = median(spectrum);
    const loudest = spectrum.reduce((a, b) => Math.max(a, b), -Infinity);
    const stands = (hz: number): boolean => {
      const peak = this.peakNear(spectrum, binHz, hz);
      return peak !== undefined && peak - floor >= this.minProminenceDb && loudest - peak <= this.maxBelowPeakDb;
    };

    let present = 0;
    for (const midi of expectedMidi) {
      const f0 = midiToFrequency(midi);
      if (stands(f0) || (stands(2 * f0) && stands(3 * f0))) present++;
    }
    return { match: present === expectedMidi.length, confidence: present / expectedMidi.length };
  }

  reset(): void {}

  private peakNear(spectrum: Float32Array, binHz: number, hz: number): number | undefined {
    const ratio = 2 ** (this.toleranceCents / 1200);
    const lo = Math.max(0, Math.floor(Math.min(hz / ratio, hz - binHz) / binHz));
    const hi = Math.min(spectrum.length - 1, Math.ceil(Math.max(hz * ratio, hz + binHz) / binHz));
    if (lo > hi) return undefined;
    let max = -Infinity;
    for (let i = lo; i <= hi; i++) max = Math.max(max, spectrum[i]!);
    return max;
  }
}

/** RMS level in dBFS. */
export function levelDb(frame: Float32Array): number {
  let sum = 0;
  for (const v of frame) sum += v * v;
  return 10 * Math.log10(sum / Math.max(1, frame.length) + 1e-20);
}
