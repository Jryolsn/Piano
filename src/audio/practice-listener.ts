import type { Detector } from './detector';
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

  constructor(
    private readonly detector: Detector,
    { holdFrames = 2, onsetDb = 6 }: PracticeListenerOptions = {},
  ) {
    this.holdFrames = holdFrames;
    this.onsetDb = onsetDb;
  }

  /** Processes one frame. Returns true when it reported a match. */
  process(frame: Float32Array, sampleRate: number, target: PracticeTarget): boolean {
    const expected = target.expected();
    const key = expected.join(',');
    if (key !== this.stepKey) this.startStep(key, expected);

    // Always feed the detector so stateful detectors keep their history and room estimate.
    const result = this.detector.detect(frame, sampleRate, expected, this.candidates);
    this.lastHeard = result.heard ?? [];
    if (expected.length === 0) return false;
    const match = result.match;

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

  /** Notes the detector heard in the latest frame, right or wrong. */
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
    this.needsOnset = false;
    this.detector.reset();
  }

  private startStep(key: string, expected: readonly number[]): void {
    this.stepKey = key;
    this.streak = 0;
    // A note still ringing from the last step would otherwise confirm a repeat of it at once.
    this.needsOnset = expected.some((m) => this.lastPlayed.includes(m));
    this.quietest = Infinity;
  }
}
