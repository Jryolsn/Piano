/**
 * Magnitude spectrum in dB of a Hann-windowed frame (radix-2 FFT).
 * Frame length must be a power of two; returns length / 2 bins of sampleRate / length Hz.
 */
export function spectrumDb(frame: Float32Array): Float32Array {
  const n = frame.length;
  if (n < 2 || (n & (n - 1)) !== 0) throw new Error(`Frame length must be a power of two, got ${n}`);

  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const j = bitReverse(i, n);
    re[j] = frame[i]! * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)));
  }

  for (let size = 2; size <= n; size *= 2) {
    const half = size / 2;
    const step = (-2 * Math.PI) / size;
    for (let start = 0; start < n; start += size) {
      for (let k = 0; k < half; k++) {
        const wr = Math.cos(step * k);
        const wi = Math.sin(step * k);
        const a = start + k;
        const b = a + half;
        const tr = re[b]! * wr - im[b]! * wi;
        const ti = re[b]! * wi + im[b]! * wr;
        re[b] = re[a]! - tr;
        im[b] = im[a]! - ti;
        re[a] = re[a]! + tr;
        im[a] = im[a]! + ti;
      }
    }
  }

  const out = new Float32Array(n / 2);
  const scale = 4 / n; // Hann coherent gain 0.5, one-sided spectrum
  for (let i = 0; i < out.length; i++) {
    out[i] = 20 * Math.log10(Math.hypot(re[i]!, im[i]!) * scale + 1e-12);
  }
  return out;
}

function bitReverse(i: number, n: number): number {
  let r = 0;
  for (let bit = n >> 1; bit > 0; bit >>= 1, i >>= 1) r = (r << 1) | (i & 1);
  return r;
}
