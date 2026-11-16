export interface Peak {
  frequency: number;
  /** Level in dB, as reported by AnalyserNode. */
  db: number;
}

/**
 * Local maxima in a dB spectrum that rise `minProminenceDb` above the median level,
 * strongest first. Uses parabolic interpolation for sub-bin frequency accuracy.
 */
export function findPeaks(
  spectrumDb: Float32Array,
  sampleRate: number,
  { minHz = 25, maxHz = 4500, minProminenceDb = 25, maxPeaks = 6 } = {},
): Peak[] {
  const binHz = sampleRate / 2 / spectrumDb.length;
  const lo = Math.max(1, Math.floor(minHz / binHz));
  const hi = Math.min(spectrumDb.length - 2, Math.ceil(maxHz / binHz));
  if (hi <= lo) return [];

  const floor = median(spectrumDb.subarray(lo, hi + 1));
  const peaks: Peak[] = [];
  for (let i = lo; i <= hi; i++) {
    const a = spectrumDb[i - 1]!;
    const b = spectrumDb[i]!;
    const c = spectrumDb[i + 1]!;
    if (b <= a || b < c || b - floor < minProminenceDb) continue;
    const denom = a - 2 * b + c;
    const offset = denom === 0 ? 0 : (0.5 * (a - c)) / denom;
    peaks.push({ frequency: (i + offset) * binHz, db: b - 0.25 * (a - c) * offset });
  }
  return peaks.sort((x, y) => y.db - x.db).slice(0, maxPeaks);
}

function median(values: Float32Array): number {
  const sorted = Float32Array.from(values).sort();
  return sorted[sorted.length >> 1] ?? -Infinity;
}
