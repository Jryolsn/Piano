/** The `count` strongest energy onsets (seconds), at least `minGap` apart, in time order. */
export function strongestOnsets(samples: Float32Array, sampleRate: number, count: number, minGap = 0.25): number[] {
  const hop = 256;
  const rms: number[] = [];
  for (let s = 0; s + hop <= samples.length; s += hop) {
    let sum = 0;
    for (let i = s; i < s + hop; i++) sum += samples[i]! ** 2;
    rms.push(Math.sqrt(sum / hop));
  }
  const rise = rms.map((v, i) => ({ t: ((i + 1) * hop) / sampleRate, v: i < 8 ? 0 : v - Math.min(...rms.slice(i - 8, i)) }));
  const picked: number[] = [];
  for (const r of rise.sort((a, b) => b.v - a.v)) {
    if (picked.every((t) => Math.abs(t - r.t) >= minGap)) picked.push(r.t);
    if (picked.length === count) break;
  }
  return picked.sort((a, b) => a - b);
}
