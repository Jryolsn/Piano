import { describe, expect, it } from 'vitest';
import type { Note } from '../song/model';
import { firstVisibleIndex, nextOnset, soundingAt, timeToY } from './timeline';

const notes: Note[] = [
  { midi: 48, time: 0, duration: 4, hand: 'left' },
  { midi: 60, time: 0, duration: 1, hand: 'right' },
  { midi: 62, time: 1, duration: 1, hand: 'right' },
  { midi: 64, time: 2, duration: 1, hand: 'right' },
  { midi: 55, time: 2.01, duration: 1, hand: 'left' },
  { midi: 67, time: 3, duration: 1, hand: 'right' },
];
const both = ['left', 'right'] as const;

describe('firstVisibleIndex', () => {
  it('skips notes that ended before time minus the longest duration', () => {
    expect(firstVisibleIndex(notes, 3.5, 1)).toBe(5);
    expect(firstVisibleIndex(notes, 3.5, 4)).toBe(0);
  });
});

describe('soundingAt', () => {
  it('lists notes held at the time', () => {
    expect(soundingAt(notes, 1.5, 4, both)).toEqual([48, 62]);
  });

  it('filters by hand', () => {
    expect(soundingAt(notes, 1.5, 4, ['right'])).toEqual([62]);
  });
});

describe('nextOnset', () => {
  it('groups near-simultaneous notes', () => {
    expect(nextOnset(notes, 1.5, both).map((n) => n.midi)).toEqual([64, 55]);
  });

  it('excludes notes starting exactly at time', () => {
    expect(nextOnset(notes, 1, both).map((n) => n.midi)).toEqual([64, 55]);
  });

  it('skips other hands', () => {
    expect(nextOnset(notes, 0.5, ['left']).map((n) => n.midi)).toEqual([55]);
  });

  it('is empty at the end', () => {
    expect(nextOnset(notes, 3, both)).toEqual([]);
  });
});

describe('timeToY', () => {
  it('maps now to the hit line and the look-ahead edge to the top', () => {
    expect(timeToY(10, 10, 4, 300)).toBe(300);
    expect(timeToY(14, 10, 4, 300)).toBe(0);
    expect(timeToY(12, 10, 4, 300)).toBe(150);
  });
});
