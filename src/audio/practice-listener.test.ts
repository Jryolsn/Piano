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
    for (let i = 0; i < 3; i++) l.process(frame(true), 48000, target([]));
    expect(l.heard).toEqual([62]);
    l.reset();
    expect(l.heard).toEqual([]);
  });

  it('ignores a note heard for only a moment', () => {
    const blip: Detector = {
      detect: (f) => ({ match: false, confidence: 0, heard: f[0]! > 0 ? [30] : [] }),
      reset: () => {},
    };
    const l = new PracticeListener(blip);
    l.process(frame(true), 48000, target([]));
    l.process(frame(true), 48000, target([]));
    l.process(frame(false), 48000, target([]));
    l.process(frame(true), 48000, target([]));
    expect(l.heard).toEqual([]);
  });
});

describe('PracticeListener chords', () => {
  /** Detector that confirms the given notes, frame by frame. */
  function scripted(frames: number[][]): Detector {
    let i = 0;
    return {
      detect: (_f, _sr, expected) => {
        const present = frames[i++] ?? [];
        return { match: expected.every((m) => present.includes(m)), confidence: 0, present };
      },
      reset: () => {},
    };
  }

  it('accepts a chord whose notes land a few frames apart', () => {
    const t = target([[48, 60, 64, 67]]);
    const l = new PracticeListener(scripted([[48], [48, 60], [60, 64], [64, 67], [67], [67]]), { holdFrames: 2 });
    for (let i = 0; i < 6; i++) l.process(frame(true), 48000, t);
    expect(t.reported).toBe(1);
  });

  it('rejects a chord with a note missing', () => {
    const t = target([[48, 60, 64, 67]]);
    const l = new PracticeListener(scripted(Array.from({ length: 10 }, () => [48, 60, 64])), { holdFrames: 2 });
    for (let i = 0; i < 10; i++) l.process(frame(true), 48000, t);
    expect(t.reported).toBe(0);
  });

  it('forgets a note confirmed long ago', () => {
    const t = target([[60, 64]]);
    const l = new PracticeListener(scripted([[60], ...Array.from({ length: 40 }, () => []), [64], [64]]), {
      holdFrames: 2,
      chordWindowFrames: 20,
    });
    for (let i = 0; i < 43; i++) l.process(frame(true), 48000, t);
    expect(t.reported).toBe(0);
  });
});
