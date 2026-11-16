import { describe, expect, it } from 'vitest';
import { parseHand, pitchToMidi, tokenBeats } from './notation';

describe('pitchToMidi', () => {
  it('handles naturals and accidentals', () => {
    expect(pitchToMidi('C4')).toBe(60);
    expect(pitchToMidi('A0')).toBe(21);
    expect(pitchToMidi('F#3')).toBe(54);
    expect(pitchToMidi('Bb2')).toBe(46);
  });

  it('rejects bad names', () => {
    expect(() => pitchToMidi('H4')).toThrow();
  });
});

describe('tokenBeats', () => {
  it('defaults to one beat and rejects zero', () => {
    expect(tokenBeats('E4')).toBe(1);
    expect(tokenBeats('r:.5')).toBe(0.5);
    expect(() => tokenBeats('E4:0')).toThrow();
  });
});

describe('parseHand', () => {
  it('places notes, chords and rests on the beat grid', () => {
    const notes = parseHand('C4 r:.5 E4:.5 | C3+G3:2', 'left', 120);
    expect(notes).toEqual([
      { midi: 60, time: 0, duration: 0.5, hand: 'left' },
      { midi: 64, time: 0.75, duration: 0.25, hand: 'left' },
      { midi: 48, time: 1, duration: 1, hand: 'left' },
      { midi: 55, time: 1, duration: 1, hand: 'left' },
    ]);
  });
});
