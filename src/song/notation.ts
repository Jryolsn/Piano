import type { Hand, Note } from './model';

const STEPS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "C4" → 60, "F#3" → 54, "Bb2" → 46. */
export function pitchToMidi(name: string): number {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) throw new Error(`Bad pitch "${name}"`);
  const [, letter = '', accidental, octave = ''] = m;
  const shift = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0;
  return (Number(octave) + 1) * 12 + (STEPS[letter] ?? 0) + shift;
}

/** Length in beats of one token: "E4" → 1, "C4+E4:2" → 2, "r:.5" → 0.5. */
export function tokenBeats(token: string): number {
  const beats = token.split(':')[1];
  if (beats === undefined) return 1;
  const n = Number(beats);
  if (!(n > 0)) throw new Error(`Bad length in "${token}"`);
  return n;
}

/**
 * Parses a compact single-hand notation into notes.
 * Tokens are separated by spaces: `pitch[:beats]`, chords as `C4+E4+G4`, rests as `r`.
 * `|` marks bar lines and is ignored. Beats default to 1.
 */
export function parseHand(text: string, hand: Hand, bpm: number): Note[] {
  const secondsPerBeat = 60 / bpm;
  const notes: Note[] = [];
  let beat = 0;
  for (const token of text.split(/\s+/)) {
    if (token === '' || token === '|') continue;
    const beats = tokenBeats(token);
    const pitches = token.split(':')[0] ?? '';
    if (pitches !== 'r') {
      for (const p of pitches.split('+')) {
        notes.push({
          midi: pitchToMidi(p),
          time: beat * secondsPerBeat,
          duration: beats * secondsPerBeat,
          hand,
        });
      }
    }
    beat += beats;
  }
  return notes;
}
