import type { DetectionResult, Detector } from './detector';
import { spectrumDb } from './fft';
import { midiToFrequency } from './pitch';

export interface VerifierOptions {
  /** Harmonic must rise this many dB above the spectrum median to count. */
  prominenceDb: number;
  /** A note's strongest harmonic must lie within this many dB of the frame's strongest peak. */
  relativeDb: number;
  /** Frames whose strongest peak is below this level (spectrum dB) are treated as silence. */
  noiseGateDb: number;
  /**
   * Adaptive gate: frames must also peak this far above the room's ambient level. Ambient is the
   * quietest stretch heard so far (lowest 10th percentile of `ambientFrames` consecutive frame
   * peaks), so continuous playing doesn't raise it. Needs one quiet moment, e.g. before the first note.
   */
  ambientMarginDb: number;
  /** Length of the stretch the ambient estimate looks at (about 2 s at 60 calls per second). */
  ambientFrames: number;
  /** A note must have risen this much over the recent history, so ringing notes don't count as new. */
  riseDb: number;
  /** Number of previous calls kept for the rise check. */
  historyFrames: number;
  harmonics: number;
  /** Search window around each harmonic, in cents. */
  toleranceCents: number;
  maxHz: number;
  /** Above this fundamental the phone mic reliably picks up h1, so it is required. */
  fundamentalRequiredHz: number;
  /** Reject when even harmonics are this much stronger than odd ones: the octave above is sounding. */
  oddEvenDb: number;
  /** Reject when the octave below's odd partials are within this many dB of the note. */
  subOctaveDb: number;
  /** The note's main partial must exceed the spectrum a semitone either side by this much. */
  contrastDb: number;
}

export const DEFAULT_VERIFIER_OPTIONS: VerifierOptions = {
  prominenceDb: 20,
  relativeDb: 20,
  noiseGateDb: -Infinity,
  ambientMarginDb: 50,
  ambientFrames: 120,
  riseDb: 6,
  historyFrames: 30,
  harmonics: 6,
  toleranceCents: 30,
  maxHz: 5000,
  fundamentalRequiredHz: 100,
  oddEvenDb: 15,
  subOctaveDb: 25,
  contrastDb: 10,
};

/** Per-frame values shared by all note checks. */
interface FrameContext {
  db: Float32Array;
  past: Float32Array[];
  binHz: number;
  threshold: number;
  loudEnough: number;
}

/** Semitone distances to the 2nd to 4th overtone of a lower note. */
const OVERTONE_INTERVALS = [12, 19, 24];

interface NoteLevel {
  score: number;
  /** Strongest harmonic level, dB. */
  level: number;
}

/**
 * Checks whether the expected notes sound by looking for energy at each note's harmonics,
 * instead of transcribing freely. A note counts as present when at least two harmonics are, one of
 * them odd (rules out mistaking the octave below for it). Above `fundamentalRequiredHz` the
 * fundamental itself must be present, since in chords another note's overtones can otherwise fake
 * a note (C4's third harmonic is G5, G4's second). A note is also rejected when the octave below
 * is sounding and not expected, since all its partials are harmonics of that lower note.
 *
 * Stateful: call `detect` at a steady rate; each note must have risen by `riseDb` over the last
 * `historyFrames` calls.
 */
export class FftVerifier implements Detector {
  readonly options: VerifierOptions;
  private history: Float32Array[] = [];
  private peaks: number[] = [];
  private ambient = Infinity;

  constructor(options: Partial<VerifierOptions> = {}) {
    this.options = { ...DEFAULT_VERIFIER_OPTIONS, ...options };
  }

  detect(
    frame: Float32Array,
    sampleRate: number,
    expectedMidi: readonly number[],
    candidates: readonly number[] = [],
  ): DetectionResult {
    const db = spectrumDb(frame);
    const past = this.history;
    this.history = [...past.slice(1 - this.options.historyFrames), db];
    const binHz = sampleRate / frame.length;
    const { floor, max } = stats(db, binHz, this.options.maxHz);
    this.trackAmbient(max);

    if (max < this.gate()) return { match: false, confidence: 0, heard: [] };
    const ctx: FrameContext = { db, past, binHz, threshold: floor + this.options.prominenceDb, loudEnough: max - this.options.relativeDb };

    let confidence = expectedMidi.length === 0 ? 0 : 1;
    for (const midi of expectedMidi) confidence = Math.min(confidence, this.scoreNote(ctx, midi, expectedMidi));
    return { match: expectedMidi.length > 0 && confidence >= 0.5, confidence, heard: this.heardNotes(ctx, candidates, expectedMidi) };
  }

  /** Clears note history. The ambient estimate is kept, since the room doesn't change between steps. */
  reset(): void {
    this.history = [];
  }

  private trackAmbient(peak: number): void {
    this.peaks.push(peak);
    if (this.peaks.length < this.options.ambientFrames) return;
    const sorted = [...this.peaks].sort((a, b) => a - b);
    this.ambient = Math.min(this.ambient, sorted[Math.floor(sorted.length * 0.1)]!);
    this.peaks = [];
  }

  private gate(): number {
    // No quiet stretch measured yet: only the fixed gate applies.
    if (this.ambient === Infinity) return this.options.noiseGateDb;
    return Math.max(this.options.noiseGateDb, this.ambient + this.options.ambientMarginDb);
  }

  /** Confidence (0..1) that `midi` was just struck; at least 0.5 counts as heard. */
  private scoreNote(ctx: FrameContext, midi: number, expectedMidi: readonly number[]): number {
    const { db, past, binHz, threshold, loudEnough } = ctx;
    const now = this.noteLevel(db, binHz, threshold, midi);
    let score = now.score;
    if (now.level < loudEnough) score = Math.min(score, 0.4);
    // Cheap checks first: the history comparison costs one pass per past frame.
    if (score < 0.5) return score;
    const minPast = Math.min(...past.map((p) => this.noteLevel(p, binHz, -Infinity, midi).level));
    if (past.length > 0 && now.level - minPast < this.options.riseDb) score = Math.min(score, 0.4);
    if (!expectedMidi.includes(midi - 12) && this.subOctaveSounds(db, binHz, threshold, midi, now.level)) {
      score = Math.min(score, 0.4);
    }
    return score;
  }

  /** Candidates that were just struck. Overtones of a lower note that was not asked for are dropped. */
  private heardNotes(ctx: FrameContext, candidates: readonly number[], expectedMidi: readonly number[]): number[] {
    const struck = candidates.filter((m) => this.scoreNote(ctx, m, expectedMidi) >= 0.5);
    return struck.filter((m) => expectedMidi.includes(m) || !OVERTONE_INTERVALS.some((i) => struck.includes(m - i)));
  }

  private noteLevel(db: Float32Array, binHz: number, threshold: number, midi: number): NoteLevel {
    const { harmonics, maxHz, fundamentalRequiredHz } = this.options;
    const f0 = midiToFrequency(midi);
    let present = 0;
    let checked = 0;
    let odd = false;
    let fundamental = false;
    let level = -Infinity;
    let strongest = 1;
    let oddLevel = -Infinity;
    let evenLevel = -Infinity;
    for (let h = 1; h <= harmonics && h * f0 < maxHz; h++) {
      checked++;
      const peak = this.peakNear(db, binHz, h * f0);
      if (peak > level) {
        level = peak;
        strongest = h;
      }
      if (h % 2 === 1) oddLevel = Math.max(oddLevel, peak);
      else evenLevel = Math.max(evenLevel, peak);
      if (peak >= threshold) {
        present++;
        if (h % 2 === 1) odd = true;
        if (h === 1) fundamental = true;
      }
    }
    // Very high notes have only one or two harmonics in range, so a lone fundamental suffices.
    const needed = checked <= 2 ? 1 : 2;
    const octaveAbove = evenLevel - oddLevel > this.options.oddEvenDb;
    // Smeared energy from a neighbouring note (attack transients, fast repeats) is not a note.
    const main = fundamental ? 1 : strongest;
    const semitone = 2 ** (1 / 12);
    const at = (hz: number) => db[Math.round(hz / binHz)] ?? -Infinity;
    const beside = Math.max(at((main * f0) / semitone), at(main * f0 * semitone));
    // Only meaningful where a semitone spans several bins; lower down the window can't resolve it.
    const resolvable = main * f0 * (semitone - 1) >= 2.5 * binHz;
    const distinct = !resolvable || this.peakNear(db, binHz, main * f0) - beside >= this.options.contrastDb;
    const ok =
      present >= needed && odd && distinct && !octaveAbove && (fundamental || f0 < fundamentalRequiredHz);
    const fraction = present / Math.max(checked, 1);
    return { score: ok ? 0.5 + 0.5 * fraction : 0.4 * fraction, level };
  }

  /** True when both odd partials of the octave below (f0/2 and 3f0/2) are about as strong as this note. */
  private subOctaveSounds(db: Float32Array, binHz: number, threshold: number, midi: number, level: number): boolean {
    const f0 = midiToFrequency(midi);
    const half = this.peakNear(db, binHz, f0 / 2);
    const threeHalves = this.peakNear(db, binHz, (3 * f0) / 2);
    return Math.min(half, threeHalves) >= Math.max(threshold, level - this.options.subOctaveDb);
  }

  private window(db: Float32Array, binHz: number, hz: number): [number, number] {
    const ratio = 2 ** (this.options.toleranceCents / 1200);
    const lo = Math.max(1, Math.floor(hz / ratio / binHz));
    return [lo, Math.min(db.length - 2, Math.max(lo + 1, Math.ceil((hz * ratio) / binHz)))];
  }

  /** Level of the local peak within the tolerance window, or -Infinity if the window holds only a slope. */
  private peakNear(db: Float32Array, binHz: number, hz: number): number {
    const [lo, hi] = this.window(db, binHz, hz);
    let at = lo;
    for (let i = lo; i <= hi; i++) if (db[i]! > db[at]!) at = i;
    return db[at]! >= db[at - 1]! && db[at]! >= db[at + 1]! ? db[at]! : -Infinity;
  }
}

function stats(db: Float32Array, binHz: number, maxHz: number): { floor: number; max: number } {
  const lo = Math.ceil(25 / binHz);
  const hi = Math.min(db.length, Math.floor(maxHz / binHz));
  const band = Float32Array.from(db.subarray(lo, hi)).sort();
  return { floor: band[band.length >> 1] ?? -Infinity, max: band[band.length - 1] ?? -Infinity };
}
