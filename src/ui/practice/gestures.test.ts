import { describe, expect, it } from 'vitest';
import { isTap, TAP_MAX_DISTANCE, TAP_MAX_MS } from './gestures';

describe('isTap', () => {
  it('accepts a short, still touch', () => {
    expect(isTap(0, 0, 80)).toBe(true);
    expect(isTap(3, -4, TAP_MAX_MS)).toBe(true);
  });

  it('rejects movement in any direction', () => {
    expect(isTap(0, TAP_MAX_DISTANCE, 50)).toBe(false);
    expect(isTap(-TAP_MAX_DISTANCE, 0, 50)).toBe(false);
    expect(isTap(8, 8, 50)).toBe(false);
  });

  it('rejects a long hold', () => {
    expect(isTap(0, 0, TAP_MAX_MS + 1)).toBe(false);
  });
});
