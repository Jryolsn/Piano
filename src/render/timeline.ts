import type { Hand, Note } from '../song/model';

/** Index of the first note that may still be sounding at `time`. Notes must be sorted by time. */
export function firstVisibleIndex(notes: readonly Note[], time: number, maxDuration: number): number {
  let lo = 0;
  let hi = notes.length;
  const from = time - maxDuration;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (notes[mid]!.time < from) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** MIDI numbers sounding at `time` for the given hands. */
export function soundingAt(notes: readonly Note[], time: number, maxDuration: number, hands: readonly Hand[]): number[] {
  const out: number[] = [];
  for (let i = firstVisibleIndex(notes, time, maxDuration); i < notes.length; i++) {
    const n = notes[i]!;
    if (n.time > time) break;
    if (n.time + n.duration > time && hands.includes(n.hand)) out.push(n.midi);
  }
  return out;
}

/** The next group of notes starting together after `time` (within `epsilon`), for the given hands. */
export function nextOnset(notes: readonly Note[], time: number, hands: readonly Hand[], epsilon = 0.03): Note[] {
  let lo = 0;
  let hi = notes.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (notes[mid]!.time <= time) lo = mid + 1;
    else hi = mid;
  }
  const out: Note[] = [];
  for (let i = lo; i < notes.length; i++) {
    const n = notes[i]!;
    if (!hands.includes(n.hand)) continue;
    if (out.length > 0 && n.time - out[0]!.time > epsilon) break;
    out.push(n);
  }
  return out;
}

/** Vertical position of a song time on a roll whose hit line sits at `hitY` (top is `lookahead` seconds ahead). */
export function timeToY(t: number, time: number, lookahead: number, hitY: number): number {
  return hitY - ((t - time) / lookahead) * hitY;
}

/** Song seconds covered by a vertical drag of `dy` pixels (downwards moves the song forward). */
export function dragToSeconds(dy: number, lookahead: number, hitY: number): number {
  return hitY > 0 ? (dy / hitY) * lookahead : 0;
}
