import { describe, expect, it } from 'vitest';
import { frequencyToMidi, midiToFrequency, midiToName } from './pitch';

describe('pitch conversions', () => {
  it('maps A4 to 440 Hz', () => {
    expect(frequencyToMidi(440)).toBe(69);
    expect(midiToFrequency(69)).toBe(440);
  });

  it('round-trips middle C', () => {
    expect(frequencyToMidi(midiToFrequency(60))).toBeCloseTo(60);
  });

  it('names notes across octaves', () => {
    expect(midiToName(60)).toBe('C4');
    expect(midiToName(21)).toBe('A0');
    expect(midiToName(108)).toBe('C8');
    expect(midiToName(61)).toBe('C#4');
  });
});
