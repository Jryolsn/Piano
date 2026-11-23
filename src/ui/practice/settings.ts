import type { PracticeOptions } from '../../engine/practice';
import type { Hand } from '../../song/model';

export type HandChoice = 'left' | 'right' | 'both';

/** How a song is played: along without the mic, along while listening, or waiting for each note. */
export type SongMode = 'play' | 'listen' | 'wait';

export const songModes: { value: SongMode; label: string; icon: string }[] = [
  { value: 'play', label: 'Spela med', icon: '🎹' },
  { value: 'listen', label: 'Spela och lyssna', icon: '🎤' },
  { value: 'wait', label: 'Vänta på mig', icon: '✋' },
];

/** User-adjustable practice settings shown in the collapsible panel. */
export interface PracticeSettings {
  mode: SongMode;
  /** Playback speed, 1 = 100 %. */
  tempo: number;
  hand: HandChoice;
  /** Seconds of music visible ahead. */
  lookahead: number;
}

export const LOOKAHEAD_RANGE = { min: 1, max: 10, step: 0.5 } as const;

export const defaultSettings: PracticeSettings = { mode: 'wait', tempo: 1, hand: 'both', lookahead: 4 };

export function handsFor(choice: HandChoice): Hand[] {
  return choice === 'both' ? ['left', 'right'] : [choice];
}

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function engineModeFor(mode: SongMode): Pick<PracticeOptions, 'mode' | 'listening'> {
  return { mode: mode === 'wait' ? 'wait' : 'flow', listening: mode !== 'play' };
}

export function usesMic(mode: SongMode): boolean {
  return mode !== 'play';
}

/** The app sounds the song only when the mic is off, so the detector never hears the app itself. */
export function playsSound(mode: SongMode, soundOn: boolean): boolean {
  return soundOn && !usesMic(mode);
}

const MODE_KEY = 'pianoapp.songMode';
const SOUND_KEY = 'pianoapp.sound';

/** Last chosen mode, so it is preselected next time. */
export function loadSongMode(storage?: Pick<Storage, 'getItem'>): SongMode {
  const v = read(MODE_KEY, storage);
  return songModes.some((m) => m.value === v) ? (v as SongMode) : defaultSettings.mode;
}

export function saveSongMode(mode: SongMode, storage?: Pick<Storage, 'setItem'>): void {
  write(MODE_KEY, mode, storage);
}

/** Whether the song is heard in "Spela med"; on unless turned off. */
export function loadSound(storage?: Pick<Storage, 'getItem'>): boolean {
  return read(SOUND_KEY, storage) !== 'off';
}

export function saveSound(on: boolean, storage?: Pick<Storage, 'setItem'>): void {
  write(SOUND_KEY, on ? 'on' : 'off', storage);
}

// Storage may be unavailable (private mode); then nothing is remembered.
function read(key: string, storage?: Pick<Storage, 'getItem'>): string | null {
  try {
    return (storage ?? globalThis.localStorage)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function write(key: string, value: string, storage?: Pick<Storage, 'setItem'>): void {
  try {
    (storage ?? globalThis.localStorage)?.setItem(key, value);
  } catch {
    // Not remembering is fine.
  }
}
