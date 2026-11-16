import type { PracticeMode } from '../../engine/practice';
import type { Hand } from '../../song/model';

export type HandChoice = 'left' | 'right' | 'both';

/** User-adjustable practice settings shown in the collapsible panel. */
export interface PracticeSettings {
  mode: PracticeMode;
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
