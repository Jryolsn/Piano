import type { Hand } from '../song/model';

/** Calm, low-contrast palette for the note view. */
export const theme = {
  background: '#14171d',
  laneLine: 'rgba(255, 255, 255, 0.04)',
  octaveLine: 'rgba(255, 255, 255, 0.09)',
  hitLine: 'rgba(255, 255, 255, 0.25)',
  whiteKey: '#e9e7e2',
  blackKey: '#23262d',
  keyBorder: '#9a9894',
  keyLabel: '#8a8781',
  pressed: 'rgba(233, 231, 226, 0.95)',
  /** Notes and keys played correctly. */
  hit: '#6fbf86',
  /** Glow around a correctly played note while it is meant to sound. */
  glow: 'rgba(130, 235, 160, 0.9)',
  /** Marker for a key that was played but is not the right note. */
  wrong: '#e08a7a',
  hand: {
    right: { note: '#5b9bd5', active: '#8cc0f0' },
    left: { note: '#e0a458', active: '#f5c88a' },
  } satisfies Record<Hand, { note: string; active: string }>,
  /** Opacity of notes for hands not being practiced. */
  otherHandAlpha: 0.25,
  /** Opacity of notes that passed unplayed while listening. */
  missedAlpha: 0.3,
  /** Opacity of the next-onset hint on the keyboard. */
  hintAlpha: 0.35,
};
