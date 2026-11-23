import type { NoteOutput } from './song-player';

/** Sampled notes: every minor third from A0 (21) to C8 (108), as shipped in `public/samples/piano/`. */
export const SAMPLED_NOTES: readonly number[] = Array.from({ length: 30 }, (_, i) => 21 + i * 3);

const NAMES = ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B'];

/** File name stem of a sample, e.g. 60 -> "C4", 63 -> "Ds4". */
export function sampleName(midi: number): string {
  return `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

/** Closest sample for a note and the playback rate that shifts it to the note's pitch. */
export function nearestSample(midi: number): { sample: number; rate: number } {
  const clamped = Math.min(108, Math.max(21, midi));
  const sample = 21 + Math.round((clamped - 21) / 3) * 3;
  return { sample, rate: 2 ** ((midi - sample) / 12) };
}

const VOLUME = 0.6;
/** Time constant of the fade after a note's written duration, in seconds. */
const RELEASE = 0.12;

interface Voice {
  src: AudioBufferSourceNode;
  gain: GainNode;
}

/**
 * Sampled grand piano (Salamander Grand Piano, CC-BY 3.0) on its own AudioContext.
 * Samples load from the app's own files, so it works offline.
 */
export class Piano implements NoteOutput {
  private readonly ctx = new AudioContext({ latencyHint: 'interactive' });
  private readonly buffers = new Map<number, AudioBuffer>();
  private readonly voices = new Set<Voice>();

  get currentTime(): number {
    return this.ctx.currentTime;
  }

  get latency(): number {
    return this.ctx.baseLatency + (this.ctx.outputLatency || 0);
  }

  /** Fetches and decodes all samples. Notes played before this resolves are skipped. */
  async load(baseUrl = `${import.meta.env.BASE_URL}samples/piano/`): Promise<void> {
    await Promise.all(
      SAMPLED_NOTES.map(async (n) => {
        const res = await fetch(`${baseUrl}${sampleName(n)}.mp3`);
        if (!res.ok) throw new Error(`Sample ${sampleName(n)}: HTTP ${res.status}`);
        this.buffers.set(n, await this.ctx.decodeAudioData(await res.arrayBuffer()));
      }),
    );
  }

  /** Must run from a user gesture: browsers start audio only then. */
  resume(): Promise<void> {
    return this.ctx.resume();
  }

  play(midi: number, when: number, duration: number): void {
    const { sample, rate } = nearestSample(midi);
    const buffer = this.buffers.get(sample);
    if (!buffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    const gain = this.ctx.createGain();
    const start = Math.max(when, this.ctx.currentTime);
    const end = start + Math.max(duration, 0.05);
    gain.gain.setValueAtTime(VOLUME, start);
    gain.gain.setTargetAtTime(0, end, RELEASE);
    src.connect(gain).connect(this.ctx.destination);
    src.start(start);
    src.stop(end + RELEASE * 6);
    const voice = { src, gain };
    this.voices.add(voice);
    src.onended = () => {
      gain.disconnect();
      this.voices.delete(voice);
    };
  }

  /** Fades out everything sounding or scheduled. */
  stopAll(): void {
    const now = this.ctx.currentTime;
    for (const { src, gain } of this.voices) {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(0, now, 0.015);
      src.stop(now + 0.1);
    }
  }

  close(): Promise<void> {
    return this.ctx.close();
  }
}
