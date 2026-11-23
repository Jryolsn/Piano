import { describe, expect, it } from 'vitest';
import {
  engineModeFor,
  formatTime,
  handsFor,
  loadSongMode,
  loadSound,
  playsSound,
  saveSongMode,
  saveSound,
} from './settings';

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

describe('engineModeFor', () => {
  it('maps song modes to engine timing and listening', () => {
    expect(engineModeFor('play')).toEqual({ mode: 'flow', listening: false });
    expect(engineModeFor('listen')).toEqual({ mode: 'flow', listening: true });
    expect(engineModeFor('wait')).toEqual({ mode: 'wait', listening: true });
  });
});

describe('song mode storage', () => {
  it('remembers the chosen mode and ignores unknown values', () => {
    const data = new Map<string, string>();
    const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
    expect(loadSongMode(storage)).toBe('wait');
    saveSongMode('listen', storage);
    expect(loadSongMode(storage)).toBe('listen');
    data.set('pianoapp.songMode', 'bogus');
    expect(loadSongMode(storage)).toBe('wait');
  });

  it('falls back to the default when storage throws', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
    };
    expect(loadSongMode(broken)).toBe('wait');
  });
});

describe('sound', () => {
  it('is only heard when the mic is off', () => {
    expect(playsSound('play', true)).toBe(true);
    expect(playsSound('play', false)).toBe(false);
    expect(playsSound('listen', true)).toBe(false);
    expect(playsSound('wait', true)).toBe(false);
  });

  it('is on by default and remembers being turned off', () => {
    const data = new Map<string, string>();
    const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
    expect(loadSound(storage)).toBe(true);
    saveSound(false, storage);
    expect(loadSound(storage)).toBe(false);
    saveSound(true, storage);
    expect(loadSound(storage)).toBe(true);
  });
});
