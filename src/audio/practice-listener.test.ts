import { describe, expect, it } from 'vitest';
import type { DetectionResult, Detector } from './detector';
import { PracticeListener, type PracticeTarget } from './practice-listener';

/** Detector that matches positive frames. */
const fakeDetector: Detector = {
  detect: (frame): DetectionResult => ({ match: frame[0]! > 0, confidence: frame[0]! > 0 ? 1 : 0 }),
  reset: () => {},
};

/** Frame with a constant level; `hit` makes the fake detector match. */
const frame = (hit: boolean, level = 0.1) => new Float32Array(64).fill(hit ? level : -level);

function target(steps: number[][]): PracticeTarget & { reported: number } {
  return {
    reported: 0,
    expected() {
      return steps[this.reported] ?? [];
    },
    reportMatch() {
      this.reported++;
    },
  };
}

describe('PracticeListener', () => {
  it('reports after the required number of matching frames', () => {
    const t = target([[60]]);
    const l = new PracticeListener(fakeDetector, { holdFrames: 2 });
    expect(l.process(frame(true), 48000, t)).toBe(false);
    expect(l.process(frame(true), 48000, t)).toBe(true);
    expect(t.reported).toBe(1);
  });

  it('restarts the count after a miss', () => {
    const t = target([[60]]);
    const l = new PracticeListener(fakeDetector, { holdFrames: 2 });
    l.process(frame(true), 48000, t);
    l.process(frame(false), 48000, t);
    l.process(frame(true), 48000, t);
    expect(t.reported).toBe(0);
  });

  it('does nothing when no notes are expected', () => {
    const t = target([]);
    const l = new PracticeListener(fakeDetector, { holdFrames: 1 });
    expect(l.process(frame(true), 48000, t)).toBe(false);
  });

  it('needs a new strike when the next step repeats a note', () => {
    const t = target([[60], [60, 64], [67]]);
    const l = new PracticeListener(fakeDetector, { holdFrames: 1, onsetDb: 6 });
    l.process(frame(true, 0.1), 48000, t);
    expect(t.reported).toBe(1);

    // Still ringing at the same or lower level: not a new strike.
    l.process(frame(true, 0.1), 48000, t);
    l.process(frame(true, 0.05), 48000, t);
    expect(t.reported).toBe(1);

    // Louder again: struck anew.
    l.process(frame(true, 0.2), 48000, t);
    expect(t.reported).toBe(2);

    // No shared note: no onset needed.
    l.process(frame(true, 0.01), 48000, t);
    expect(t.reported).toBe(3);
  });
});

describe('PracticeListener heard notes', () => {
  it('reports what the detector heard, also when nothing is expected', () => {
    const detector: Detector = {
      detect: (_f, _sr, _e, candidates) => ({ match: false, confidence: 0, heard: candidates?.slice(0, 1) ?? [] }),
      reset: () => {},
    };
    const l = new PracticeListener(detector);
    l.setCandidates([62, 64]);
    l.process(frame(true), 48000, target([]));
    expect(l.heard).toEqual([62]);
    l.reset();
    expect(l.heard).toEqual([]);
  });
});
