export type Hand = 'left' | 'right';

export interface Note {
  /** MIDI note number, 21 (A0) to 108 (C8). */
  midi: number;
  /** Start time in seconds from song start, at 100 % tempo. */
  time: number;
  duration: number;
  hand: Hand;
}

export interface Song {
  title: string;
  /** Sorted by time. */
  notes: Note[];
  duration: number;
}
