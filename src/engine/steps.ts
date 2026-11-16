import type { Hand, Note } from '../song/model';

/** Notes the player must strike together: one chord or a single note. */
export interface Step {
  /** Onset in song seconds. */
  time: number;
  /** MIDI numbers, ascending, without duplicates. */
  midi: number[];
}

/** Onsets closer than this are treated as one chord (rolled or slightly uneven notation). */
export const CHORD_TOLERANCE = 0.03;

/** Groups notes of the practiced hands into steps. Expects notes sorted by time. */
export function buildSteps(notes: readonly Note[], hands: readonly Hand[]): Step[] {
  const steps: Step[] = [];
  let current: Step | undefined;
  for (const n of notes) {
    if (!hands.includes(n.hand)) continue;
    if (current && n.time - current.time <= CHORD_TOLERANCE) {
      if (!current.midi.includes(n.midi)) current.midi.push(n.midi);
    } else {
      current = { time: n.time, midi: [n.midi] };
      steps.push(current);
    }
  }
  for (const s of steps) s.midi.sort((a, b) => a - b);
  return steps;
}
