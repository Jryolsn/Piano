import type { Note } from '../song/model';

/** Where notes are sounded, on its own audio clock (seconds). */
export interface NoteOutput {
  readonly currentTime: number;
  /** Seconds from scheduling time to the speaker, subtracted so notes sound as they reach the keys. */
  readonly latency: number;
  play(midi: number, when: number, duration: number): void;
  stopAll(): void;
}

/** How far ahead of the audio clock notes are handed to the output, in wall-clock seconds. */
export const SCHEDULE_AHEAD = 0.1;

/**
 * Plays a song's notes in step with the practice position. Called once per frame with the position
 * the session just reached; notes are scheduled slightly ahead on the audio clock so timing does not
 * depend on frame jitter.
 */
export class SongPlayer {
  private next = 0;
  private last = 0;
  private running = false;

  constructor(
    private readonly notes: readonly Note[],
    private readonly out: NoteOutput,
  ) {}

  update(time: number, tempo: number, running: boolean): void {
    if (!running) {
      if (this.running) this.out.stopAll();
      this.running = false;
      return;
    }
    // Starting, or jumping back (loop restart): continue from the current position.
    if (!this.running || time < this.last) this.resync(time);
    this.running = true;
    this.last = time;

    const { currentTime, latency } = this.out;
    const horizon = time + (SCHEDULE_AHEAD + latency) * tempo;
    while (this.next < this.notes.length && this.notes[this.next]!.time < horizon) {
      const note = this.notes[this.next++]!;
      // Notes already passed (after a frame gap or a seek forward) are skipped, not played in a burst.
      if (note.time < time) continue;
      const when = currentTime + (note.time - time) / tempo - latency;
      this.out.play(note.midi, Math.max(currentTime, when), note.duration / tempo);
    }
  }

  /** Silences what is sounding; the next update continues from its position. Call on seek. */
  reset(): void {
    if (this.running) this.out.stopAll();
    this.running = false;
  }

  private resync(time: number): void {
    this.out.stopAll();
    const i = this.notes.findIndex((n) => n.time >= time);
    this.next = i === -1 ? this.notes.length : i;
  }
}
