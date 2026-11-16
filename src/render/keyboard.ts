import type { Note } from '../song/model';

export const LOWEST_MIDI = 21;
export const HIGHEST_MIDI = 108;

const BLACK_PITCH_CLASSES = new Set([1, 3, 6, 8, 10]);
/** Black key width relative to a white key. */
const BLACK_WIDTH = 0.6;

export function isBlack(midi: number): boolean {
  return BLACK_PITCH_CLASSES.has(((midi % 12) + 12) % 12);
}

export interface KeyRange {
  low: number;
  high: number;
}

/**
 * Smallest range of whole octaves (C to B) covering the notes, at least `minOctaves` wide,
 * clamped to the 88-key piano.
 */
export function keyRangeFor(notes: readonly Note[], minOctaves = 2): KeyRange {
  if (notes.length === 0) return { low: 48, high: 71 };
  let min = Infinity;
  let max = -Infinity;
  for (const n of notes) {
    if (n.midi < min) min = n.midi;
    if (n.midi > max) max = n.midi;
  }
  let low = min - (min % 12);
  let high = max - (max % 12) + 11;
  while ((high - low + 1) / 12 < minOctaves) {
    // Grow towards the side with less headroom around middle C first.
    if (60 - low > high - 60) high += 12;
    else low -= 12;
  }
  return { low: Math.max(LOWEST_MIDI, low), high: Math.min(HIGHEST_MIDI, high) };
}

export interface KeyRect {
  midi: number;
  black: boolean;
  x: number;
  width: number;
}

/** Horizontal geometry of every key in range, white keys first so black keys draw on top. */
export function layoutKeys(range: KeyRange, totalWidth: number): KeyRect[] {
  let whiteCount = 0;
  for (let m = range.low; m <= range.high; m++) if (!isBlack(m)) whiteCount++;
  const whiteWidth = totalWidth / whiteCount;
  const blackWidth = whiteWidth * BLACK_WIDTH;

  const whites: KeyRect[] = [];
  const blacks: KeyRect[] = [];
  let whiteIndex = 0;
  for (let m = range.low; m <= range.high; m++) {
    if (isBlack(m)) {
      // Centered on the boundary between the neighbouring white keys.
      blacks.push({ midi: m, black: true, x: whiteIndex * whiteWidth - blackWidth / 2, width: blackWidth });
    } else {
      whites.push({ midi: m, black: false, x: whiteIndex * whiteWidth, width: whiteWidth });
      whiteIndex++;
    }
  }
  return [...whites, ...blacks];
}
