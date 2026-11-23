import { describe, expect, it } from 'vitest';
import type { Note } from '../song/model';
import { SCHEDULE_AHEAD, SongPlayer, type NoteOutput } from './song-player';

function note(midi: number, time: number, duration = 0.5): Note {
  return { midi, time, duration, hand: 'right' };
}

function fakeOutput(latency = 0) {
  const played: { midi: number; when: number; duration: number }[] = [];
  const out = {
    currentTime: 10,
    latency,
    stops: 0,
    play: (midi: number, when: number, duration: number) => void played.push({ midi, when, duration }),
    stopAll: () => void out.stops++,
  } satisfies NoteOutput & { stops: number };
  return { out, played };
}

const notes = [note(60, 0), note(62, 0.05), note(64, 1), note(65, 2)];

describe('SongPlayer', () => {
  it('schedules notes just ahead on the audio clock', () => {
    const { out, played } = fakeOutput();
    const player = new SongPlayer(notes, out);
    player.update(0, 1, true);
    expect(played).toEqual([
      { midi: 60, when: 10, duration: 0.5 },
      { midi: 62, when: 10.05, duration: 0.5 },
    ]);

    out.currentTime = 10.95;
    player.update(0.95, 1, true);
    expect(played).toHaveLength(3);
    expect(played[2]!.midi).toBe(64);
    expect(played[2]!.when).toBeCloseTo(11);
  });

  it('never schedules a note twice', () => {
    const { out, played } = fakeOutput();
    const player = new SongPlayer(notes, out);
    player.update(0, 1, true);
    player.update(0.01, 1, true);
    expect(played).toHaveLength(2);
  });

  it('scales timing and duration with tempo', () => {
    const { out, played } = fakeOutput();
    const player = new SongPlayer(notes, out);
    player.update(0.96, 0.5, true);
    expect(played).toEqual([{ midi: 64, when: 10.08, duration: 1 }]);
  });

  it('starts early by the output latency', () => {
    const { out, played } = fakeOutput(0.05);
    const player = new SongPlayer(notes, out);
    player.update(0.9, 1, true);
    expect(played[0]!.when).toBeCloseTo(10.05);
  });

  it('skips notes passed during a gap instead of playing them in a burst', () => {
    const { out, played } = fakeOutput();
    const player = new SongPlayer(notes, out);
    player.update(0.5, 1, true);
    player.update(1.5 + SCHEDULE_AHEAD, 1, true);
    expect(played.map((p) => p.midi)).toEqual([]);
  });

  it('stops sound when paused and resumes from the new position', () => {
    const { out, played } = fakeOutput();
    const player = new SongPlayer(notes, out);
    player.update(0, 1, true);
    player.update(0.02, 1, false);
    expect(out.stops).toBeGreaterThan(0);
    played.length = 0;
    player.update(1.95, 1, true);
    expect(played.map((p) => p.midi)).toEqual([65]);
  });

  it('restarts from a jump back, as when a loop wraps', () => {
    const { out, played } = fakeOutput();
    const player = new SongPlayer(notes, out);
    player.update(1.95, 1, true);
    const stops = out.stops;
    player.update(0, 1, true);
    expect(out.stops).toBe(stops + 1);
    expect(played.map((p) => p.midi)).toEqual([65, 60, 62]);
  });

  it('continues from the seek position after reset', () => {
    const { out, played } = fakeOutput();
    const player = new SongPlayer(notes, out);
    player.update(0, 1, true);
    player.reset();
    played.length = 0;
    player.update(0.95, 1, true);
    expect(played.map((p) => p.midi)).toEqual([64]);
  });
});
