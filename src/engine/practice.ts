import type { Hand, Song } from '../song/model';
import { buildSteps, type Step } from './steps';

export type PracticeMode = 'wait' | 'tempo';

export interface LoopRange {
  from: number;
  to: number;
}

export interface PracticeOptions {
  /** `wait` holds at each step until it is played; `tempo` keeps going. */
  mode: PracticeMode;
  /** Playback speed, 1 = 100 %. Clamped to [MIN_TEMPO, MAX_TEMPO]. */
  tempo: number;
  hands: Hand[];
  loop: LoopRange | null;
}

export const MIN_TEMPO = 0.25;
export const MAX_TEMPO = 1.5;
/** How long before its onset (wall-clock seconds) a step may already be played. */
export const EARLY_WINDOW = 0.2;
/** How long after its onset (wall-clock seconds) a step still counts in tempo mode. */
export const LATE_WINDOW = 0.25;

const DEFAULTS: PracticeOptions = { mode: 'wait', tempo: 1, hands: ['left', 'right'], loop: null };

/**
 * Practice transport: position, tempo, seek, loop and wait mode.
 * Pure logic with no timers; the caller drives it with `tick(dt)` from its frame loop.
 */
export class PracticeSession {
  readonly song: Song;
  private opts: PracticeOptions;
  private steps: Step[] = [];
  /** Index of the first step not yet played or passed. */
  private current = 0;
  private t = 0;
  private isPlaying = false;
  private isWaiting = false;

  constructor(song: Song, options: Partial<PracticeOptions> = {}) {
    this.song = song;
    this.opts = { ...DEFAULTS };
    this.setOptions({ hands: DEFAULTS.hands, ...options });
  }

  get time(): number {
    return this.t;
  }

  get playing(): boolean {
    return this.isPlaying;
  }

  /** True while wait mode holds the position until the current step is played. */
  get waiting(): boolean {
    return this.isWaiting;
  }

  get options(): Readonly<PracticeOptions> {
    return this.opts;
  }

  setOptions(patch: Partial<PracticeOptions>): void {
    const next = { ...this.opts, ...patch };
    next.tempo = Math.min(MAX_TEMPO, Math.max(MIN_TEMPO, next.tempo));
    next.loop = next.loop && this.normalizeLoop(next.loop);
    this.opts = next;
    if (next.mode === 'tempo') this.isWaiting = false;
    if (patch.hands !== undefined) {
      this.steps = buildSteps(this.song.notes, next.hands);
      this.seek(this.t);
    }
    const { loop } = next;
    if (loop && (this.t < loop.from || this.t >= loop.to)) this.seek(loop.from);
  }

  play(): void {
    if (this.t >= this.song.duration) this.seek(this.opts.loop?.from ?? 0);
    this.isPlaying = true;
  }

  pause(): void {
    this.isPlaying = false;
  }

  seek(time: number): void {
    this.t = Math.min(this.song.duration, Math.max(0, time));
    this.isWaiting = false;
    this.current = this.firstStepAtOrAfter(this.t);
  }

  /** Advances by `dt` wall-clock seconds. */
  tick(dt: number): void {
    if (!this.isPlaying || this.isWaiting || dt <= 0) return;
    const { mode, tempo, loop } = this.opts;
    const end = loop ? loop.to : this.song.duration;
    const target = this.t + dt * tempo;

    const step = this.steps[this.current];
    if (mode === 'wait' && step && step.time < end && step.time <= target) {
      this.t = step.time;
      this.isWaiting = true;
      return;
    }

    if (target >= end) {
      if (loop) this.seek(loop.from);
      else {
        this.t = this.song.duration;
        this.current = this.steps.length;
        this.isPlaying = false;
      }
      return;
    }

    this.t = target;
    if (mode === 'tempo') {
      const late = LATE_WINDOW * tempo;
      while (this.steps[this.current] && this.steps[this.current]!.time < this.t - late) this.current++;
    }
  }

  /** MIDI notes the player is expected to strike now; empty when nothing is due. */
  expected(): readonly number[] {
    const step = this.steps[this.current];
    if (!step) return [];
    if (this.opts.loop && step.time >= this.opts.loop.to) return [];
    const early = EARLY_WINDOW * this.opts.tempo;
    return step.time - this.t <= early ? step.midi : [];
  }

  /** Called when the detector heard the expected notes. Releases a wait and moves to the next step. */
  reportMatch(): void {
    if (this.expected().length === 0) return;
    this.current++;
    this.isWaiting = false;
  }

  private firstStepAtOrAfter(time: number): number {
    const i = this.steps.findIndex((s) => s.time >= time);
    return i === -1 ? this.steps.length : i;
  }

  private normalizeLoop({ from, to }: LoopRange): LoopRange | null {
    const a = Math.max(0, Math.min(from, to));
    const b = Math.min(this.song.duration, Math.max(from, to));
    return b > a ? { from: a, to: b } : null;
  }
}
