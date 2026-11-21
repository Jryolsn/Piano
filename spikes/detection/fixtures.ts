import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { decodeWav } from '../../src/audio/wav';

const DIR = resolve(import.meta.dirname, '../../test/fixtures/mic');

/** Expected note events per recording, in playing order. Each event is a set of MIDI notes. */
export const EVENTS: Record<string, number[][]> = {
  '02-middle-c': [[60], [60], [60], [60]],
  '03-low-notes': [[21], [24], [36], [48]],
  '04-high-notes': [[72], [84], [96], [108]],
  '05-scale': [60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65, 64, 62, 60].map((m) => [m]),
  '06-chord': Array.from({ length: 4 }, () => [60, 64, 67]),
  '07-two-hands': Array.from({ length: 4 }, () => [48, 60, 64, 67]),
  '08-repeated': Array.from({ length: 8 }, () => [60]),
  '09-pedal': [[60], [64], [67]],
};

export function load(id: string): { samples: Float32Array; sampleRate: number } {
  const buf = readFileSync(resolve(DIR, `${id}.wav`));
  return decodeWav(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}
