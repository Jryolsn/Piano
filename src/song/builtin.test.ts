import { describe, expect, it } from 'vitest';
import { ARRANGEMENTS, arrangementToSong } from './builtin';
import { tokenBeats } from './notation';

function barLengths(text: string): number[] {
  return text.split('|').map((bar) =>
    bar
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .reduce((sum, t) => sum + tokenBeats(t), 0),
  );
}

describe.each(ARRANGEMENTS)('$title', (a) => {
  const hands = a.left ? [a.right, a.left] : [a.right];

  it('has full bars apart from pickup and last bar', () => {
    for (const hand of hands) {
      const bars = barLengths(hand);
      for (const len of bars.slice(1, -1)) expect(len).toBe(a.beatsPerBar);
      expect(bars[0]).toBeLessThanOrEqual(a.beatsPerBar);
    }
  });

  it('has hands of equal bar count and pickup', () => {
    if (!a.left) return;
    const [r, l] = [barLengths(a.right), barLengths(a.left)];
    expect(l.length).toBe(r.length);
    expect(l[0]).toBe(r[0]);
  });

  it('builds a sorted song within the piano range', () => {
    const song = arrangementToSong(a);
    expect(song.notes.length).toBeGreaterThan(0);
    for (const [i, n] of song.notes.entries()) {
      expect(n.midi).toBeGreaterThanOrEqual(21);
      expect(n.midi).toBeLessThanOrEqual(108);
      if (i > 0) expect(n.time).toBeGreaterThanOrEqual(song.notes[i - 1]!.time);
    }
  });
});

it('has unique ids and is ordered by difficulty', () => {
  expect(new Set(ARRANGEMENTS.map((a) => a.id)).size).toBe(ARRANGEMENTS.length);
  const d = ARRANGEMENTS.map((a) => a.difficulty);
  expect(d).toEqual([...d].sort((x, y) => x - y));
});
