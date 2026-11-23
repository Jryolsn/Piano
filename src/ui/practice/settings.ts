import type { PracticeOptions } from '../../engine/practice';
import type { Hand } from '../../song/model';

export type HandChoice = 'left' | 'right' | 'both';

/** How a song is played: heard only, played along with while the mic listens, or waiting for each note. */
export type SongMode = 'listen' | 'along' | 'wait';

export const songModes: { value: SongMode; label: string; hint: string }[] = [
  { value: 'listen', label: 'Lyssna', hint: 'Hör hur låten låter' },
  { value: 'along', label: 'Spela med', hint: 'Följ med, appen lyssnar' },
  { value: 'wait', label: 'Vänta', hint: 'Låten väntar på dig' },
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
  return { mode: mode === 'wait' ? 'wait' : 'flow', listening: mode !== 'listen' };
}

export function usesMic(mode: SongMode): boolean {
  return mode !== 'listen';
}

/** The app sounds the song only in Lyssna, so the detector never hears the app itself. */
export function playsSound(mode: SongMode): boolean {
  return !usesMic(mode);
}

const MODE_KEY = 'pianoapp.mode';

/** Last chosen mode, so it is preselected next time. */
export function loadSongMode(storage?: Pick<Storage, 'getItem'>): SongMode {
  const v = read(MODE_KEY, storage);
  return songModes.some((m) => m.value === v) ? (v as SongMode) : defaultSettings.mode;
}

export function saveSongMode(mode: SongMode, storage?: Pick<Storage, 'setItem'>): void {
  write(MODE_KEY, mode, storage);
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
