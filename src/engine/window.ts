import type { Hand, Note } from '../song/model';

/** Notes overlapping [from, to), filtered by practiced hands. Expects notes sorted by time. */
export function notesInWindow(
  notes: readonly Note[],
  from: number,
  to: number,
  hands: readonly Hand[] = ['left', 'right'],
): Note[] {
  const out: Note[] = [];
  for (const n of notes) {
    if (n.time >= to) break;
    if (n.time + n.duration > from && hands.includes(n.hand)) out.push(n);
  }
  return out;
}
