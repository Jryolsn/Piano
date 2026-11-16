import { Midi } from '@tonejs/midi';
import type { Hand, Note, Song } from './model';

const PERCUSSION_CHANNEL = 9;
const MIDDLE_C = 60;
const LEFT_NAME = /\b(left|lh|bass|links|vänster)\b/i;
const RIGHT_NAME = /\b(right|rh|treble|melody|höger)\b/i;

interface Part {
  name: string;
  notes: { midi: number; time: number; duration: number }[];
}

export class MidiImportError extends Error {}

/**
 * Parses a Standard MIDI File into a Song. Times are in seconds with all tempo changes applied.
 * Hands come from track/channel names, otherwise from pitch: with two parts the higher one is the
 * right hand; a single part is split at middle C.
 */
export function songFromMidi(data: ArrayBuffer | Uint8Array, fallbackTitle: string): Song {
  let midi: Midi;
  try {
    midi = new Midi(data);
  } catch {
    throw new MidiImportError('Not a valid MIDI file');
  }

  const parts: Part[] = midi.tracks
    .filter((t) => t.channel !== PERCUSSION_CHANNEL && t.notes.length > 0)
    .map((t) => ({ name: t.name, notes: t.notes }));
  if (parts.length === 0) throw new MidiImportError('The file has no playable notes');

  const notes: Note[] = [];
  const hands = assignHands(parts);
  parts.forEach((part, i) => {
    const hand = hands[i];
    for (const n of part.notes) {
      notes.push({
        midi: n.midi,
        time: n.time,
        duration: n.duration,
        hand: hand ?? (n.midi < MIDDLE_C ? 'left' : 'right'),
      });
    }
  });
  notes.sort((a, b) => a.time - b.time || a.midi - b.midi);

  return {
    title: midi.name.trim() || fallbackTitle,
    notes,
    duration: Math.max(...notes.map((n) => n.time + n.duration)),
  };
}

/** One hand per part, or undefined to split that part per note at middle C. */
function assignHands(parts: Part[]): (Hand | undefined)[] {
  const named = parts.map((p): Hand | undefined =>
    LEFT_NAME.test(p.name) ? 'left' : RIGHT_NAME.test(p.name) ? 'right' : undefined,
  );
  if (parts.length === 1 && named[0] === undefined) return [undefined];

  const unnamed = parts.flatMap((p, i) => (named[i] ? [] : [{ i, pitch: averagePitch(p) }]));
  const [a, b] = unnamed;
  if (parts.length === 2 && a && b) {
    const aHigher = a.pitch >= b.pitch;
    named[a.i] = aHigher ? 'right' : 'left';
    named[b.i] = aHigher ? 'left' : 'right';
  } else {
    for (const u of unnamed) named[u.i] = u.pitch < MIDDLE_C ? 'left' : 'right';
  }
  return named;
}

function averagePitch(part: Part): number {
  return part.notes.reduce((sum, n) => sum + n.midi, 0) / part.notes.length;
}
