import { Midi } from '@tonejs/midi';
import { describe, expect, it } from 'vitest';
import { MidiImportError, songFromMidi } from './midi';

function track(midi: Midi, name: string, pitches: number[], channel = 0) {
  const t = midi.addTrack();
  t.name = name;
  t.channel = channel;
  pitches.forEach((p, i) => t.addNote({ midi: p, ticks: i * midi.header.ppq, durationTicks: midi.header.ppq }));
}

function bytes(midi: Midi): Uint8Array {
  return midi.toArray();
}

describe('songFromMidi', () => {
  it('assigns the higher of two tracks to the right hand', () => {
    const m = new Midi();
    track(m, '', [48, 50], 1);
    track(m, '', [72, 74], 0);
    const song = songFromMidi(bytes(m), 'Fallback');
    expect(song.notes.filter((n) => n.hand === 'right').map((n) => n.midi)).toEqual([72, 74]);
    expect(song.notes.filter((n) => n.hand === 'left').map((n) => n.midi)).toEqual([48, 50]);
  });

  it('respects hand names over pitch', () => {
    const m = new Midi();
    track(m, 'Left hand', [72], 0);
    track(m, 'Right hand', [48], 1);
    const song = songFromMidi(bytes(m), 'x');
    expect(song.notes.find((n) => n.midi === 72)?.hand).toBe('left');
    expect(song.notes.find((n) => n.midi === 48)?.hand).toBe('right');
  });

  it('splits a single track at middle C', () => {
    const m = new Midi();
    track(m, 'Piano', [59, 60]);
    const song = songFromMidi(bytes(m), 'x');
    expect(song.notes.map((n) => n.hand)).toEqual(['left', 'right']);
  });

  it('ignores percussion and uses the file name as fallback title', () => {
    const m = new Midi();
    track(m, 'Drums', [36, 38], 9);
    track(m, 'Piano', [64]);
    const song = songFromMidi(bytes(m), 'My song');
    expect(song.title).toBe('My song');
    expect(song.notes.map((n) => n.midi)).toEqual([64]);
  });

  it('applies tempo changes', () => {
    const m = new Midi();
    m.header.tempos.push({ bpm: 120, ticks: 0 }, { bpm: 60, ticks: 2 * m.header.ppq });
    m.header.update();
    track(m, '', [60, 62, 64, 65]);
    const song = songFromMidi(bytes(m), 'x');
    expect(song.notes.map((n) => n.time)).toEqual([0, 0.5, 1, 2]);
    expect(song.duration).toBe(3);
  });

  it('rejects invalid or empty files', () => {
    expect(() => songFromMidi(new Uint8Array([1, 2, 3]), 'x')).toThrow(MidiImportError);
    expect(() => songFromMidi(bytes(new Midi()), 'x')).toThrow(MidiImportError);
  });
});
