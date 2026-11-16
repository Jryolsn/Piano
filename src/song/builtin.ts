import type { Song } from './model';
import { parseHand } from './notation';

/**
 * Built-in songs: public-domain melodies in the project's own simple arrangements (MIT).
 * Written in the notation from `notation.ts`; bars must add up to `beatsPerBar`
 * (except a pickup first bar and the last bar), which the tests check.
 */
export interface Arrangement {
  id: string;
  title: string;
  composer: string;
  /** 1 (first steps) to 5 (hardest). */
  difficulty: number;
  bpm: number;
  beatsPerBar: number;
  right: string;
  left?: string;
}

export const ARRANGEMENTS: readonly Arrangement[] = [
  {
    id: 'mary-had-a-little-lamb',
    title: 'Mary Had a Little Lamb',
    composer: 'Trad.',
    difficulty: 1,
    bpm: 100,
    beatsPerBar: 4,
    right: `E4 D4 C4 D4 | E4 E4 E4:2 | D4 D4 D4:2 | E4 G4 G4:2 |
            E4 D4 C4 D4 | E4 E4 E4 E4 | D4 D4 E4 D4 | C4:4`,
  },
  {
    id: 'ode-to-joy',
    title: 'Ode to Joy',
    composer: 'Ludwig van Beethoven',
    difficulty: 1,
    bpm: 100,
    beatsPerBar: 4,
    right: `E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | E4:1.5 D4:.5 D4:2 |
            E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | D4:1.5 C4:.5 C4:2`,
  },
  {
    id: 'frere-jacques',
    title: 'Frère Jacques',
    composer: 'Trad.',
    difficulty: 1,
    bpm: 110,
    beatsPerBar: 4,
    right: `C4 D4 E4 C4 | C4 D4 E4 C4 | E4 F4 G4:2 | E4 F4 G4:2 |
            G4:.5 A4:.5 G4:.5 F4:.5 E4 C4 | G4:.5 A4:.5 G4:.5 F4:.5 E4 C4 |
            C4 G3 C4:2 | C4 G3 C4:2`,
  },
  {
    id: 'twinkle-twinkle',
    title: 'Twinkle, Twinkle, Little Star',
    composer: 'Trad.',
    difficulty: 2,
    bpm: 100,
    beatsPerBar: 4,
    right: `C4 C4 G4 G4 | A4 A4 G4:2 | F4 F4 E4 E4 | D4 D4 C4:2 |
            G4 G4 F4 F4 | E4 E4 D4:2 | G4 G4 F4 F4 | E4 E4 D4:2 |
            C4 C4 G4 G4 | A4 A4 G4:2 | F4 F4 E4 E4 | D4 D4 C4:2`,
    left: `C3:4 | F3:2 C3:2 | F3:2 C3:2 | G2:2 C3:2 |
           C3:2 F3:2 | C3:2 G2:2 | C3:2 F3:2 | C3:2 G2:2 |
           C3:4 | F3:2 C3:2 | F3:2 C3:2 | G2:2 C3:2`,
  },
  {
    id: 'when-the-saints',
    title: 'When the Saints Go Marching In',
    composer: 'Trad.',
    difficulty: 2,
    bpm: 120,
    beatsPerBar: 4,
    right: `C4 E4 F4 | G4:4 | r C4 E4 F4 | G4:4 | r C4 E4 F4 | G4:2 E4:2 | C4:2 E4:2 | D4:4 |
            r E4 E4 D4 | C4:3 C4 | E4:2 G4:2 | G4:2 F4:2 | r E4 F4 G4 | E4:2 C4:2 | D4:4 | C4:4`,
    left: `r:3 | C3:4 | C3:4 | C3:4 | C3:4 | C3:4 | C3:4 | G2:4 |
           C3:4 | C3:4 | C3:4 | F3:4 | C3:4 | C3:4 | G2:4 | C3:4`,
  },
  {
    id: 'jingle-bells',
    title: 'Jingle Bells',
    composer: 'James Lord Pierpont',
    difficulty: 3,
    bpm: 120,
    beatsPerBar: 4,
    right: `E4 E4 E4:2 | E4 E4 E4:2 | E4 G4 C4:1.5 D4:.5 | E4:4 |
            F4 F4 F4:1.5 F4:.5 | F4 E4 E4 E4:.5 E4:.5 | E4 D4 D4 E4 | D4:2 G4:2 |
            E4 E4 E4:2 | E4 E4 E4:2 | E4 G4 C4:1.5 D4:.5 | E4:4 |
            F4 F4 F4 F4 | F4 E4 E4 E4:.5 E4:.5 | G4 G4 F4 D4 | C4:4`,
    left: `C3+G3:4 | C3+G3:4 | C3+G3:4 | C3+G3:4 |
           F3+A3:4 | C3+G3:4 | G2+D3:4 | G2+D3:4 |
           C3+G3:4 | C3+G3:4 | C3+G3:4 | C3+G3:4 |
           F3+A3:4 | C3+G3:4 | G2+D3:4 | C3+G3:4`,
  },
  {
    id: 'minuet-in-g',
    title: 'Minuet in G',
    composer: 'Christian Petzold',
    difficulty: 3,
    bpm: 100,
    beatsPerBar: 3,
    right: `D5 G4:.5 A4:.5 B4:.5 C5:.5 | D5 G4 G4 | E5 C5:.5 D5:.5 E5:.5 F#5:.5 | G5 G4 G4 |
            C5 D5:.5 C5:.5 B4:.5 A4:.5 | B4 C5:.5 B4:.5 A4:.5 G4:.5 | F#4 G4:.5 A4:.5 B4:.5 G4:.5 | A4:3 |
            D5 G4:.5 A4:.5 B4:.5 C5:.5 | D5 G4 G4 | E5 C5:.5 D5:.5 E5:.5 F#5:.5 | G5 G4 G4 |
            C5 D5:.5 C5:.5 B4:.5 A4:.5 | B4 C5:.5 B4:.5 A4:.5 G4:.5 | A4 B4:.5 A4:.5 G4:.5 F#4:.5 | G4:3`,
    left: `G3:3 | B3:3 | C4:3 | B3:3 | A3:3 | G3:3 | D3:3 | D3:3 |
           G3:3 | B3:3 | C4:3 | B3:3 | A3:3 | G3:3 | D3:3 | G2:3`,
  },
  {
    id: 'fur-elise',
    title: 'Für Elise (theme)',
    composer: 'Ludwig van Beethoven',
    difficulty: 4,
    // Beat = eighth note.
    bpm: 160,
    beatsPerBar: 3,
    right: `E5:.5 D#5:.5 | E5:.5 D#5:.5 E5:.5 B4:.5 D5:.5 C5:.5 | A4 r:.5 C4:.5 E4:.5 A4:.5 |
            B4 r:.5 E4:.5 G#4:.5 B4:.5 | C5 r:.5 E4:.5 E5:.5 D#5:.5 |
            E5:.5 D#5:.5 E5:.5 B4:.5 D5:.5 C5:.5 | A4 r:.5 C4:.5 E4:.5 A4:.5 |
            B4 r:.5 E4:.5 C5:.5 B4:.5 | A4:3`,
    left: `r | r:3 | A2:.5 E3:.5 A3:.5 r:1.5 |
           E2:.5 E3:.5 G#3:.5 r:1.5 | A2:.5 E3:.5 A3:.5 r:1.5 |
           r:3 | A2:.5 E3:.5 A3:.5 r:1.5 |
           E2:.5 E3:.5 G#3:.5 r:1.5 | A2:.5 E3:.5 A3:.5 r:1.5`,
  },
];

export function arrangementToSong(a: Arrangement): Song {
  const notes = [
    ...parseHand(a.right, 'right', a.bpm),
    ...(a.left ? parseHand(a.left, 'left', a.bpm) : []),
  ].sort((x, y) => x.time - y.time || x.midi - y.midi);
  return {
    title: a.title,
    notes,
    duration: Math.max(...notes.map((n) => n.time + n.duration)),
  };
}
