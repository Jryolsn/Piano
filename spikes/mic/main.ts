// Throwaway spike: is browser mic input on Android good enough for piano detection?
import { openMic } from '../../src/audio/mic';
import { frequencyToMidi, midiToName } from '../../src/audio/pitch';
import { findPeaks } from '../../src/audio/spectrum';
import { encodeWav } from '../../src/audio/wav';
import { keyboardSvg, zoomRange } from './keyboard';
import { Recorder } from './recorder';
import { TAKES } from './takes';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const startButton = $<HTMLButtonElement>('start');
const notesEl = $('notes');
const levelBar = $('level').firstElementChild as HTMLDivElement;
const canvas = $<HTMLCanvasElement>('spectrum');
const info = $<HTMLTableElement>('info');

const MIN_HZ = 25;
const MAX_HZ = 4500;

startButton.addEventListener('click', async () => {
  startButton.disabled = true;
  try {
    await run();
  } catch (err) {
    showInfo([['Error', String(err), false]]);
    startButton.disabled = false;
  }
});

async function run(): Promise<void> {
  const stream = await openMic();
  const ctx = new AudioContext({ latencyHint: 'interactive' });
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 16384;
  analyser.smoothingTimeConstant = 0;
  source.connect(analyser);

  const track = stream.getAudioTracks()[0]!;
  const s = track.getSettings() as MediaTrackSettings & { latency?: number };
  setupRecording(ctx, await Recorder.create(ctx, source), {
    settings: s,
    sampleRate: ctx.sampleRate,
    baseLatency: ctx.baseLatency,
    outputLatency: ctx.outputLatency,
    userAgent: navigator.userAgent,
  });
  const off = (label: string, v: unknown): Row => [label, v === false ? 'off' : String(v), v === false];
  showInfo([
    off('Echo cancellation', s.echoCancellation),
    off('Noise suppression', s.noiseSuppression),
    off('Auto gain', s.autoGainControl),
    ['Sample rate', `${ctx.sampleRate} Hz`, true],
    ['Input latency (reported)', ms(s.latency), undefined],
    ['Audio base latency', ms(ctx.baseLatency), undefined],
    ['FFT window', `${Math.round((analyser.fftSize / ctx.sampleRate) * 1000)} ms`, undefined],
    ['User agent', navigator.userAgent, undefined],
  ]);

  const spectrum = new Float32Array(analyser.frequencyBinCount);
  const wave = new Float32Array(analyser.fftSize);
  const draw = () => {
    analyser.getFloatFrequencyData(spectrum);
    analyser.getFloatTimeDomainData(wave);

    const rms = Math.sqrt(wave.reduce((sum, x) => sum + x * x, 0) / wave.length);
    const db = 20 * Math.log10(rms || 1e-9);
    levelBar.style.width = `${Math.max(0, Math.min(100, ((db + 70) / 70) * 100))}%`;

    const peaks = findPeaks(spectrum, ctx.sampleRate, { minHz: MIN_HZ, maxHz: MAX_HZ });
    const names = [...new Set(peaks.map((p) => midiToName(frequencyToMidi(p.frequency))))];
    notesEl.textContent = names.join(' ');

    drawSpectrum(spectrum, ctx.sampleRate);
    requestAnimationFrame(draw);
  };
  draw();
}

function setupRecording(ctx: AudioContext, recorder: Recorder, environment: object): void {
  const select = $<HTMLSelectElement>('take');
  const recButton = $<HTMLButtonElement>('rec');
  const status = $('recstatus');
  const recorded: Record<string, number> = {};

  select.replaceChildren(...TAKES.map((t, i) => new Option(`${i + 1}/${TAKES.length}: ${t.title}`, t.id)));
  const showInstruction = () => {
    const take = TAKES.find((t) => t.id === select.value)!;
    $('title').textContent = take.title;
    $('steps').replaceChildren(
      ...take.steps.map((text) => Object.assign(document.createElement('li'), { textContent: text })),
    );
    $('kbd-full').replaceChildren(keyboardSvg(take.keys));
    $('kbd-zoom').replaceChildren(take.keys.length ? keyboardSvg(take.keys, ...zoomRange(take.keys)) : '');
  };
  select.addEventListener('change', showInstruction);
  // ?take=<id> jumps straight to one take, for re-recording.
  const requested = new URLSearchParams(location.search).get('take');
  if (requested && TAKES.some((t) => t.id === requested)) select.value = requested;
  showInstruction();

  recButton.addEventListener('click', () => {
    if (!recorder.isRecording) {
      recorder.start();
      recButton.textContent = 'Stopp';
      status.textContent = 'Spelar in… tryck Stopp när du är klar.';
      return;
    }
    const samples = recorder.stop();
    recButton.textContent = 'Spela in';
    recorded[select.value] = samples.length / ctx.sampleRate;
    download(`${select.value}.wav`, new Blob([encodeWav(samples, ctx.sampleRate)], { type: 'audio/wav' }));
    const last = select.selectedIndex === TAKES.length - 1;
    status.textContent = last
      ? 'Klart! Tryck Ladda ner rapport och skicka alla filer.'
      : `Sparad (${recorded[select.value]!.toFixed(1)} s). Nästa steg visas ovan.`;
    if (!last) select.selectedIndex++;
    showInstruction();
  });

  $('report').addEventListener('click', () => {
    const report = { createdAt: new Date().toISOString(), environment, takes: TAKES, recorded };
    download('report.json', new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
  });

  $('record').hidden = false;
}

function download(name: string, blob: Blob): void {
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function drawSpectrum(spectrum: Float32Array, sampleRate: number): void {
  const w = (canvas.width = canvas.clientWidth * devicePixelRatio);
  const h = (canvas.height = canvas.clientHeight * devicePixelRatio);
  const g = canvas.getContext('2d')!;
  const binHz = sampleRate / 2 / spectrum.length;
  const logMin = Math.log(MIN_HZ);
  const logSpan = Math.log(MAX_HZ) - logMin;
  g.strokeStyle = '#4fc3f7';
  g.beginPath();
  for (let x = 0; x < w; x++) {
    const hz = Math.exp(logMin + (x / w) * logSpan);
    const db = spectrum[Math.round(hz / binHz)] ?? -140;
    const y = h * Math.min(1, Math.max(0, -db / 120));
    if (x === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.stroke();
}

function ms(seconds: number | undefined): string {
  return seconds === undefined ? 'n/a' : `${(seconds * 1000).toFixed(1)} ms`;
}

type Row = readonly [label: string, value: string, ok: boolean | undefined];

function showInfo(rows: Row[]): void {
  info.replaceChildren(
    ...rows.map(([label, value, ok]) => {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.textContent = value;
      if (ok !== undefined) td.className = ok ? 'good' : 'bad';
      tr.append(Object.assign(document.createElement('td'), { textContent: label }), td);
      return tr;
    }),
  );
}
