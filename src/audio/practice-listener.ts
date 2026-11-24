import type { DetectionResult, Detector } from './detector';
import { levelDb } from './spectrum';

/** The part of a practice session the listener drives. */
export interface PracticeTarget {
  expected(): readonly number[];
  reportMatch(): void;
}

export interface PracticeListenerOptions {
  /** Consecutive matching frames needed before a step counts as played. */
  holdFrames?: number;
  /** Level rise (dB) that marks a new strike when a step repeats a still sounding note. */
  onsetDb?: number;
  /** Frames a chord's notes may be confirmed apart: fingers never land at exactly the same time. */
  chordWindowFrames?: number;
  /** Consecutive frames a note must be heard before it is reported as heard, so noise blips don't flicker. */
  heardFrames?: number;
}

/** Feeds microphone frames to a detector and reports played steps to the practice session. */
export class PracticeListener {
  private readonly holdFrames: number;
  private readonly onsetDb: number;
  private stepKey = '';
  private streak = 0;
  private lastPlayed: readonly number[] = [];
  private needsOnset = false;
  private quietest = Infinity;
  private candidates: readonly number[] = [];
  private lastHeard: readonly number[] = [];
  private frameNo = 0;
  /** Frame number at which each expected note was last confirmed. */
  private confirmedAt = new Map<number, number>();
  /** Consecutive frames each candidate note has been heard. */
  private heardStreak = new Map<number, number>();
  private readonly chordWindowFrames: number;
  private readonly heardFrames: number;

  constructor(
    private readonly detector: Detector,
    { holdFrames = 2, onsetDb = 6, chordWindowFrames = 20, heardFrames = 3 }: PracticeListenerOptions = {},
  ) {
    this.holdFrames = holdFrames;
    this.onsetDb = onsetDb;
    this.chordWindowFrames = chordWindowFrames;
    this.heardFrames = heardFrames;
  }

  /** Processes one frame. Returns true when it reported a match. */
  process(frame: Float32Array, sampleRate: number, target: PracticeTarget): boolean {
    const expected = target.expected();
    const key = expected.join(',');
    if (key !== this.stepKey) this.startStep(key, expected);

    // Always feed the detector so stateful detectors keep their history and room estimate.
    const result = this.detector.detect(frame, sampleRate, expected, this.candidates);
    this.frameNo++;
    this.lastHeard = this.stableHeard(result.heard ?? []);
    if (expected.length === 0) return false;
    const match = this.chordMatch(result, expected);

    if (this.needsOnset) {
      const level = levelDb(frame);
      this.quietest = Math.min(this.quietest, level);
      if (level - this.quietest < this.onsetDb) return false;
      this.needsOnset = false;
    }

    this.streak = match ? this.streak + 1 : 0;
    if (this.streak < this.holdFrames) return false;

    this.lastPlayed = [...expected];
    this.stepKey = '';
    target.reportMatch();
    return true;
  }

  /** Keeps only notes heard in `heardFrames` consecutive frames. */
  private stableHeard(heard: readonly number[]): number[] {
    const next = new Map<number, number>();
    for (const m of heard) next.set(m, (this.heardStreak.get(m) ?? 0) + 1);
    this.heardStreak = next;
    return heard.filter((m) => next.get(m)! >= this.heardFrames);
  }

  /** True when every expected note was confirmed within the chord window, not necessarily in the same frame. */
  private chordMatch(result: DetectionResult, expected: readonly number[]): boolean {
    if (expected.length === 1 || !result.present) return result.match;
    for (const m of result.present) this.confirmedAt.set(m, this.frameNo);
    return expected.every((m) => this.frameNo - (this.confirmedAt.get(m) ?? -Infinity) < this.chordWindowFrames);
  }

  /** Notes the detector has heard steadily, right or wrong. */
  get heard(): readonly number[] {
    return this.lastHeard;
  }

  /** Notes the detector should look for besides the expected ones, e.g. the keys on screen. */
  setCandidates(midi: readonly number[]): void {
    this.candidates = midi;
  }

  /** Notes of the step most recently reported as played. */
  get played(): readonly number[] {
    return this.lastPlayed;
  }

  reset(): void {
    this.stepKey = '';
    this.streak = 0;
    this.lastPlayed = [];
    this.lastHeard = [];
    this.confirmedAt.clear();
    this.heardStreak.clear();
    this.needsOnset = false;
    this.detector.reset();
  }

  private startStep(key: string, expected: readonly number[]): void {
    this.stepKey = key;
    this.streak = 0;
    this.confirmedAt.clear();
    // A note still ringing from the last step would otherwise confirm a repeat of it at once.
    this.needsOnset = expected.some((m) => this.lastPlayed.includes(m));
    this.quietest = Infinity;
  }
}
