import { describe, expect, it } from 'vitest';
import { formatTime, handsFor } from './settings';

describe('handsFor', () => {
  it('maps the hand choice to engine hands', () => {
    expect(handsFor('both')).toEqual(['left', 'right']);
    expect(handsFor('left')).toEqual(['left']);
  });
});

describe('formatTime', () => {
  it('formats minutes and seconds', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(75.9)).toBe('1:15');
    expect(formatTime(-2)).toBe('0:00');
  });
});
