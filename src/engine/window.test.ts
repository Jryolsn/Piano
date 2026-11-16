import { describe, expect, it } from 'vitest';
import type { Note } from '../song/model';
import { notesInWindow } from './window';

const notes: Note[] = [
  { midi: 60, time: 0, duration: 1, hand: 'right' },
  { midi: 48, time: 0.5, duration: 2, hand: 'left' },
  { midi: 64, time: 2, duration: 1, hand: 'right' },
  { midi: 67, time: 5, duration: 1, hand: 'right' },
];

describe('notesInWindow', () => {
  it('includes notes overlapping the window', () => {
    expect(notesInWindow(notes, 1, 3).map((n) => n.midi)).toEqual([48, 64]);
  });

  it('excludes notes starting at the window end', () => {
    expect(notesInWindow(notes, 0, 2).map((n) => n.midi)).toEqual([60, 48]);
  });

  it('filters by hand', () => {
    expect(notesInWindow(notes, 0, 10, ['left']).map((n) => n.midi)).toEqual([48]);
  });

  it('returns empty for a window with no notes', () => {
    expect(notesInWindow(notes, 3.5, 4.5)).toEqual([]);
  });
});
