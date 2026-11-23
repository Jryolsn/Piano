import { describe, expect, it } from 'vitest';
import { midiToFrequency } from './pitch';
import { FftVerifier } from './verifier';

const SR = 48000;
const N = 8192;

/** Synthetic piano-like tone: decaying harmonics plus a little noise. */
function tone(midis: number[], { skipFundamental = false } = {}): Float32Array {
  let seed = 1;
  const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 1e-3;
  return Float32Array.from({ length: N }, (_, i) => {
    let v = noise();
    for (const m of midis) {
      for (let h = skipFundamental ? 2 : 1; h <= 6; h++) {
        v += (0.2 / h) * Math.sin((2 * Math.PI * midiToFrequency(m) * h * i) / SR);
      }
    }
    return v;
  });
}

describe('FftVerifier', () => {
  // Fresh instance per call: the rise check compares against earlier calls.
  const v = { detect: (...args: Parameters<FftVerifier['detect']>) => new FftVerifier().detect(...args) };

  it('matches a single expected note', () => {
    expect(v.detect(tone([60]), SR, [60]).match).toBe(true);
  });

  it('rejects neighbouring notes', () => {
    expect(v.detect(tone([60]), SR, [61]).match).toBe(false);
    expect(v.detect(tone([60]), SR, [62]).match).toBe(false);
  });

  it('rejects the octave below, whose odd harmonics are missing', () => {
    expect(v.detect(tone([60]), SR, [48]).match).toBe(false);
  });

  it('matches a chord only when every note sounds', () => {
    expect(v.detect(tone([60, 64, 67]), SR, [60, 64, 67]).match).toBe(true);
    expect(v.detect(tone([60, 64]), SR, [60, 64, 67]).match).toBe(false);
  });

  it('matches a low note without its fundamental', () => {
    expect(v.detect(tone([33], { skipFundamental: true }), SR, [33]).match).toBe(true);
  });

  it('rejects a note that is still ringing from before', () => {
    const verifier = new FftVerifier();
    verifier.detect(tone([60]), SR, [60]);
    expect(verifier.detect(tone([60]), SR, [60]).match).toBe(false);
  });

  it('accepts a note that starts after silence', () => {
    const verifier = new FftVerifier();
    verifier.detect(new Float32Array(N), SR, [60]);
    expect(verifier.detect(tone([60]), SR, [60]).match).toBe(true);
  });

  it('rejects the octave above when only the lower note sounds', () => {
    expect(v.detect(tone([48]), SR, [60]).match).toBe(false);
  });

  it('rejects a faint note once it has learned the room is quiet', () => {
    const verifier = new FftVerifier();
    for (let i = 0; i < 120; i++) verifier.detect(tone([60]).map((x) => x * 1e-5), SR, []);
    const faint = tone([60]).map((x) => x * 1e-3);
    expect(verifier.detect(faint, SR, [60]).match).toBe(false);
    expect(verifier.detect(tone([60]), SR, [60]).match).toBe(true);
  });

  it('rejects silence', () => {
    expect(v.detect(new Float32Array(N), SR, [60]).match).toBe(false);
  });
});

describe('FftVerifier heard notes', () => {
  const heard = (midis: number[], expected: number[] = []) =>
    new FftVerifier().detect(tone(midis), SR, expected, [58, 59, 60, 61, 62, 64, 67, 72]).heard;

  it('names an unexpected note that was played', () => {
    expect(heard([62], [60])).toContain(62);
  });

  it('includes expected notes that sound', () => {
    expect(heard([60], [60])).toContain(60);
  });

  it('does not report the neighbours of a played note', () => {
    expect(heard([60])).not.toContain(61);
    expect(heard([60])).not.toContain(59);
  });

  it('reports nothing for silence', () => {
    expect(heard([])).toEqual([]);
  });
});
