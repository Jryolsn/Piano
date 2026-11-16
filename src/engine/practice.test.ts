import { describe, expect, it } from 'vitest';
import type { Note, Song } from '../song/model';
import { MAX_TEMPO, MIN_TEMPO, PracticeSession } from './practice';
import { buildSteps } from './steps';

const note = (midi: number, time: number, hand: Note['hand'] = 'right'): Note => ({ midi, time, duration: 0.5, hand });

const song: Song = {
  title: 'test',
  notes: [note(60, 1), note(48, 1, 'left'), note(64, 2), note(67, 3), note(43, 3.01, 'left'), note(72, 5)],
  duration: 6,
};

/** Ticks in small steps like a frame loop would. */
function run(s: PracticeSession, seconds: number, frame = 1 / 60): void {
  for (let t = 0; t < seconds - 1e-9; t += frame) s.tick(Math.min(frame, seconds - t));
}

describe('buildSteps', () => {
  it('groups near-simultaneous notes into chords and filters hands', () => {
    expect(buildSteps(song.notes, ['left', 'right']).map((s) => s.midi)).toEqual([[48, 60], [64], [43, 67], [72]]);
    expect(buildSteps(song.notes, ['left'])).toEqual([
      { time: 1, midi: [48] },
      { time: 3.01, midi: [43] },
    ]);
  });
});

describe('PracticeSession tempo mode', () => {
  it('advances by dt scaled by tempo and stops at the end', () => {
    const s = new PracticeSession(song, { mode: 'tempo', tempo: 0.5 });
    s.play();
    run(s, 2);
    expect(s.time).toBeCloseTo(1);
    run(s, 20);
    expect(s.time).toBe(6);
    expect(s.playing).toBe(false);
  });

  it('does not move while paused', () => {
    const s = new PracticeSession(song, { mode: 'tempo' });
    s.tick(1);
    expect(s.time).toBe(0);
  });

  it('clamps tempo', () => {
    const s = new PracticeSession(song, { tempo: 10 });
    expect(s.options.tempo).toBe(MAX_TEMPO);
    s.setOptions({ tempo: 0 });
    expect(s.options.tempo).toBe(MIN_TEMPO);
  });

  it('exposes expected notes around the onset and drops them once late', () => {
    const s = new PracticeSession(song, { mode: 'tempo' });
    s.seek(0.7);
    expect(s.expected()).toEqual([]);
    s.seek(0.9);
    expect(s.expected()).toEqual([48, 60]);
    s.play();
    run(s, 0.3);
    expect(s.expected()).toEqual([48, 60]);
    run(s, 0.1);
    expect(s.expected()).toEqual([]);
  });

  it('moves to the next step on a match without stopping', () => {
    const s = new PracticeSession(song, { mode: 'tempo' });
    s.seek(1);
    s.reportMatch();
    expect(s.expected()).toEqual([]);
    s.play();
    run(s, 0.9);
    expect(s.expected()).toEqual([64]);
  });
});

describe('PracticeSession wait mode', () => {
  it('holds at a step until it is played', () => {
    const s = new PracticeSession(song);
    s.play();
    run(s, 3);
    expect(s.time).toBe(1);
    expect(s.waiting).toBe(true);
    expect(s.expected()).toEqual([48, 60]);

    s.reportMatch();
    expect(s.waiting).toBe(false);
    run(s, 0.5);
    expect(s.time).toBeCloseTo(1.5);
  });

  it('accepts a step played slightly early and does not stop there', () => {
    const s = new PracticeSession(song);
    s.seek(1.85);
    expect(s.expected()).toEqual([64]);
    s.reportMatch();
    s.play();
    run(s, 0.5);
    expect(s.time).toBeCloseTo(2.35);
    expect(s.waiting).toBe(false);
  });

  it('ignores matches when nothing is due', () => {
    const s = new PracticeSession(song);
    s.reportMatch();
    s.play();
    run(s, 2);
    expect(s.time).toBe(1);
  });

  it('scales the early window with tempo', () => {
    const s = new PracticeSession(song, { tempo: 0.5 });
    s.seek(0.85);
    expect(s.expected()).toEqual([]);
    s.seek(0.95);
    expect(s.expected()).toEqual([48, 60]);
  });

  it('only waits for the practiced hand', () => {
    const s = new PracticeSession(song, { hands: ['left'] });
    s.play();
    run(s, 2);
    s.reportMatch();
    run(s, 5);
    expect(s.time).toBeCloseTo(3.01);
    expect(s.expected()).toEqual([43]);
  });

  it('releases a hold when switching to tempo mode', () => {
    const s = new PracticeSession(song);
    s.play();
    run(s, 2);
    s.setOptions({ mode: 'tempo' });
    expect(s.waiting).toBe(false);
    run(s, 0.5);
    expect(s.time).toBeCloseTo(1.5);
  });

  it('keeps an early match when tempo changes', () => {
    const s = new PracticeSession(song);
    s.seek(1.9);
    s.reportMatch();
    s.setOptions({ tempo: 0.8 });
    expect(s.expected()).toEqual([]);
  });
});

describe('PracticeSession seek and loop', () => {
  it('clamps seek and resets the step pointer', () => {
    const s = new PracticeSession(song);
    s.seek(-3);
    expect(s.time).toBe(0);
    s.seek(99);
    expect(s.time).toBe(6);
    s.seek(2.5);
    s.play();
    run(s, 1);
    expect(s.time).toBe(3);
    expect(s.expected()).toEqual([43, 67]);
  });

  it('play at the end restarts from the beginning', () => {
    const s = new PracticeSession(song, { mode: 'tempo' });
    s.seek(6);
    s.play();
    expect(s.time).toBe(0);
  });

  it('wraps from loop end back to loop start', () => {
    const s = new PracticeSession(song, { mode: 'tempo', loop: { from: 1.5, to: 2.5 } });
    expect(s.time).toBe(1.5);
    s.play();
    run(s, 1.2);
    expect(s.time).toBeGreaterThanOrEqual(1.5);
    expect(s.time).toBeLessThan(1.8);
    expect(s.playing).toBe(true);
  });

  it('waits for steps inside the loop but not for the step at its end', () => {
    const s = new PracticeSession(song, { loop: { from: 1.5, to: 3 } });
    s.play();
    run(s, 1);
    expect(s.time).toBe(2);
    s.reportMatch();
    run(s, 0.95);
    expect(s.expected()).toEqual([]);
    run(s, 0.1);
    expect(s.time).toBeLessThan(1.7);
    run(s, 1);
    expect(s.time).toBe(2);
    expect(s.waiting).toBe(true);
    expect(s.expected()).toEqual([64]);
  });

  it('normalizes the loop range', () => {
    const s = new PracticeSession(song, { loop: { from: 9, to: 4 } });
    expect(s.options.loop).toEqual({ from: 4, to: 6 });
    s.setOptions({ loop: { from: 2, to: 2 } });
    expect(s.options.loop).toBeNull();
  });

  it('jumps into the loop when the position is outside it', () => {
    const s = new PracticeSession(song);
    s.seek(5);
    s.setOptions({ loop: { from: 1, to: 2 } });
    expect(s.time).toBe(1);
  });
});
