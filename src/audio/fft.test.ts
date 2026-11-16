import { describe, expect, it } from 'vitest';
import { spectrumDb } from './fft';

describe('spectrumDb', () => {
  it('puts a sine at its bin with the right level', () => {
    const n = 1024;
    const sampleRate = 1024;
    const frame = Float32Array.from({ length: n }, (_, i) => 0.5 * Math.sin((2 * Math.PI * 100 * i) / sampleRate));
    const db = spectrumDb(frame);
    expect(db.length).toBe(512);
    const loudest = db.indexOf(Math.max(...db));
    expect(loudest).toBe(100);
    expect(db[100]).toBeCloseTo(20 * Math.log10(0.5), 0);
  });

  it('rejects lengths that are not a power of two', () => {
    expect(() => spectrumDb(new Float32Array(1000))).toThrow();
  });
});
