import { describe, expect, it } from 'vitest';
import { midiToFrequency } from './pitch';
import { SpectralDetector } from './spectral-detector';

const SR = 48000;
const N = 8192;

/** Piano-like tone: harmonics with falling amplitude, plus low noise. `skipFundamental` mimics a weak low end. */
function tone(midis: number[], { skipFundamental = false, amp = 0.2 } = {}): Float32Array {
  let seed = 1;
  const noise = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31 - 0.5) * 2e-3;
  return Float32Array.from({ length: N }, (_, i) => {
    let v = noise();
    for (const m of midis) {
      const f0 = midiToFrequency(m);
      for (let h = skipFundamental ? 2 : 1; h <= 6; h++) v += (amp / h) * Math.sin((2 * Math.PI * f0 * h * i) / SR);
    }
    return v;
  });
}

describe('SpectralDetector', () => {
  const d = new SpectralDetector();

  it('matches a single expected note', () => {
    expect(d.detect(tone([69]), SR, [69])).toEqual({ match: true, confidence: 1 });
  });

  it('matches a chord and reports partial confidence for a missing note', () => {
    expect(d.detect(tone([60, 64, 67]), SR, [60, 64, 67]).match).toBe(true);
    const partial = d.detect(tone([60, 67]), SR, [60, 64, 67]);
    expect(partial.match).toBe(false);
    expect(partial.confidence).toBeCloseTo(2 / 3);
  });

  it('rejects a wrong note', () => {
    expect(d.detect(tone([62]), SR, [60]).match).toBe(false);
  });

  it('rejects the same note an octave higher', () => {
    expect(d.detect(tone([72]), SR, [60]).match).toBe(false);
  });

  it('accepts a low note with a missing fundamental', () => {
    expect(d.detect(tone([36], { skipFundamental: true }), SR, [36]).match).toBe(true);
  });

  it('never matches silence, quiet noise or an empty expectation', () => {
    expect(d.detect(new Float32Array(N), SR, [60]).match).toBe(false);
    expect(d.detect(tone([60], { amp: 0 }), SR, [60]).match).toBe(false);
    expect(d.detect(tone([60]), SR, []).match).toBe(false);
  });
});
