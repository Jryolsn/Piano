// Compares detection methods on the recorded fixtures. Run: npx tsx spikes/detection/compare.ts
import { PitchDetector } from 'pitchy';
import { frequencyToMidi } from '../../src/audio/pitch';
import { FftVerifier } from '../../src/audio/verifier';
import { EVENTS, load } from './fixtures';
import { strongestOnsets } from './onsets';

const FRAME = 8192;
const STEP = 0.01;
const WINDOW = 0.5;
/** Audio fed before each onset so stateful detectors have history. */
const LEAD = 0.4;
const DISTRACTOR_SHIFTS = [-12, -2, -1, 1, 2, 12];

interface Row {
  take: string;
  method: string;
  hits: number;
  total: number;
  latenciesMs: number[];
  falsePositives: number;
  distractors: number;
}

interface Check {
  reset(): void;
  check(frame: Float32Array, sampleRate: number, expected: number[]): boolean;
}

// Same settings as the app; the ambient gate is primed per recording, as a session would be.
const verifier = new FftVerifier();
const fftCheck: Check = {
  reset: () => verifier.reset(),
  check: (f, sr, e) => verifier.detect(f, sr, e).match,
};

const pitchy = PitchDetector.forFloat32Array(FRAME);
const pitchyCheck: Check = {
  reset: () => {},
  check: (f, sr, e) => {
    if (e.length !== 1) return false;
    const [hz, clarity] = pitchy.findPitch(f, sr);
    return clarity > 0.9 && Math.round(frequencyToMidi(hz)) === e[0];
  },
};

/** Causal frames ending in [onset - LEAD, onset + WINDOW]. */
function* frames(samples: Float32Array, sr: number, onset: number) {
  for (let t = onset - LEAD; t <= onset + WINDOW; t += STEP) {
    const end = Math.round(t * sr);
    if (end - FRAME < 0 || end > samples.length) continue;
    yield { t, frame: samples.subarray(end - FRAME, end) };
  }
}

function distractorsFor(event: number[]): number[][] {
  return event.flatMap((_, i) =>
    DISTRACTOR_SHIFTS.map((d) => event.map((m, j) => (i === j ? m + d : m))).filter(
      (set) => set.every((m) => m >= 21 && m <= 108) && new Set(set).size === set.length,
    ),
  );
}

function evaluate(take: string, method: string, check: Check, monophonicOnly: boolean): Row | undefined {
  const events = EVENTS[take]!;
  if (monophonicOnly && events.some((e) => e.length > 1)) return undefined;
  const { samples, sampleRate } = load(take);
  const onsets = strongestOnsets(samples, sampleRate, events.length);
  if (method === 'fft-verify') primeAmbient(samples, sampleRate);
  const row: Row = { take, method, hits: 0, total: events.length, latenciesMs: [], falsePositives: 0, distractors: 0 };
  events.forEach((event, i) => {
    const onset = onsets[i]!;
    check.reset();
    for (const { t, frame } of frames(samples, sampleRate, onset)) {
      if (check.check(frame, sampleRate, event) && t >= onset) {
        row.hits++;
        row.latenciesMs.push(Math.round((t - onset) * 1000));
        break;
      }
    }
    for (const wrong of distractorsFor(event)) {
      row.distractors++;
      check.reset();
      for (const { t, frame } of frames(samples, sampleRate, onset)) {
        if (check.check(frame, sampleRate, wrong) && t >= onset) {
          row.falsePositives++;
          break;
        }
      }
    }
  });
  return row;
}

/** Feeds a whole recording so the adaptive gate has seen the room, as it would in a session. */
function primeAmbient(samples: Float32Array, sampleRate: number): void {
  for (let end = FRAME; end <= samples.length; end += Math.round(sampleRate / 60)) {
    verifier.detect(samples.subarray(end - FRAME, end), sampleRate, []);
  }
}

function silenceFalsePositives(check: Check): { fp: number; total: number } {
  const { samples, sampleRate } = load('01-silence');
  let fp = 0;
  let total = 0;
  for (let m = 36; m <= 96; m++) {
    total++;
    check.reset();
    for (let end = FRAME; end <= samples.length; end += Math.round(STEP * sampleRate)) {
      if (check.check(samples.subarray(end - FRAME, end), sampleRate, [m])) {
        fp++;
        break;
      }
    }
  }
  return { fp, total };
}

const median = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[xs.length >> 1]! : NaN);

const rows: Row[] = [];
for (const take of Object.keys(EVENTS)) {
  rows.push(evaluate(take, 'fft-verify', fftCheck, false)!);
  const p = evaluate(take, 'pitchy', pitchyCheck, true);
  if (p) rows.push(p);
}

console.log('take            method      hits   median ms  wrong-note FP');
for (const r of rows) {
  console.log(
    `${r.take.padEnd(15)} ${r.method.padEnd(11)} ${`${r.hits}/${r.total}`.padEnd(6)} ${String(median(r.latenciesMs)).padEnd(10)} ${r.falsePositives}/${r.distractors}`,
  );
}
for (const [name, check] of [['fft-verify', fftCheck], ['pitchy', pitchyCheck]] as const) {
  const s = silenceFalsePositives(check);
  console.log(`silence ${name}: ${s.fp}/${s.total} notes falsely detected in room noise`);
}
