<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { createFrameSource, openMic, type FrameSource } from '../../audio/mic';
  import { PracticeListener } from '../../audio/practice-listener';
  import { SpectralDetector } from '../../audio/spectral-detector';
  import { PracticeSession, type LoopRange } from '../../engine/practice';
  import type { RollFrame } from '../../render/roll';
  import type { Song } from '../../song/model';
  import RollCanvas from './RollCanvas.svelte';
  import SettingsPanel from './SettingsPanel.svelte';
  import { defaultSettings, formatTime, handsFor, type PracticeSettings } from './settings';

  interface Props {
    song: Song;
    onExit?: () => void;
  }

  let { song, onExit }: Props = $props();

  let settings = $state<PracticeSettings>({ ...defaultSettings });
  let loop = $state<LoopRange | null>(null);
  let panelOpen = $state(false);
  let time = $state(0);
  let playing = $state(false);
  let pressed = $state<number[]>([]);
  let mic = $state<'off' | 'starting' | 'on' | 'error'>('off');
  let micSource: FrameSource | null = null;
  const listener = new PracticeListener(new SpectralDetector());

  const session = $derived(new PracticeSession(song));

  $effect(() => {
    session.setOptions({
      mode: settings.mode,
      tempo: settings.tempo,
      hands: handsFor(settings.hand),
      loop,
    });
    listener.reset();
  });

  function frame(dt: number): RollFrame {
    const s = untrack(() => session);
    s.tick(dt);
    if (micSource) listener.process(micSource.read(), micSource.sampleRate, s);
    time = s.time;
    playing = s.playing;
    return {
      time: s.time,
      lookahead: untrack(() => settings.lookahead),
      hands: s.options.hands,
      expected: s.waiting ? s.expected() : undefined,
      pressed: untrack(() => pressed),
    };
  }

  function togglePlay() {
    if (session.playing) session.pause();
    else session.play();
    playing = session.playing;
  }

  function seek(to: number) {
    session.seek(Math.min(song.duration, Math.max(0, to)));
    time = session.time;
    listener.reset();
  }

  /** Must run from a user gesture: browsers only allow audio and mic access then. */
  async function toggleMic() {
    if (micSource) {
      const src = micSource;
      micSource = null;
      mic = 'off';
      await src.close();
      return;
    }
    mic = 'starting';
    try {
      micSource = createFrameSource(await openMic());
      listener.reset();
      mic = 'on';
    } catch {
      mic = 'error';
    }
  }

  /** Keys tapped recently count together, so chords can be tapped one key at a time with a mouse. */
  const CHORD_WINDOW_MS = 1500;
  const tappedAt = new Map<number, number>();

  function keyDown(midi: number) {
    pressed = [...pressed, midi];
    const now = performance.now();
    tappedAt.set(midi, now);
    const expected = session.expected();
    if (expected.length > 0 && expected.every((m) => now - (tappedAt.get(m) ?? -Infinity) <= CHORD_WINDOW_MS)) {
      session.reportMatch();
      tappedAt.clear();
    }
  }

  function keyUp(midi: number) {
    pressed = pressed.filter((m) => m !== midi);
  }

  function setLoopStart() {
    loop = { from: time, to: loop && loop.to > time ? loop.to : song.duration };
  }

  function setLoopEnd() {
    loop = { from: loop && loop.from < time ? loop.from : 0, to: time };
  }

  onMount(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement && e.target.type !== 'range') return;
      if (e.code === 'Space') togglePlay();
      else if (e.code === 'ArrowLeft') seek(session.time - 5);
      else if (e.code === 'ArrowRight') seek(session.time + 5);
      else if (e.code === 'Escape') panelOpen = false;
      else return;
      e.preventDefault();
    }
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      session.pause();
      void micSource?.close();
      micSource = null;
    };
  });
</script>

<div class="screen">
  <RollCanvas notes={song.notes} {frame} onKeyDown={keyDown} onKeyUp={keyUp} />

  <div class="bar" class:dim={playing && !panelOpen}>
    {#if onExit}
      <button class="icon" onclick={onExit} aria-label="Tillbaka">‹</button>
    {/if}
    <button class="icon play" onclick={togglePlay} aria-label={playing ? 'Pausa' : 'Spela'}>
      {playing ? '❚❚' : '▶'}
    </button>
    <span class="time">{formatTime(time)}</span>
    <input
      class="seek"
      type="range"
      min="0"
      max={song.duration}
      step="0.01"
      value={time}
      oninput={(e) => seek(e.currentTarget.valueAsNumber)}
      aria-label="Position i låten"
    />
    <span class="time">{formatTime(song.duration)}</span>
    <button
      class="icon mic"
      class:on={mic === 'on'}
      class:error={mic === 'error'}
      onclick={toggleMic}
      disabled={mic === 'starting'}
      aria-label={mic === 'on' ? 'Stäng av mikrofonen' : 'Lyssna med mikrofonen'}
      title={mic === 'error' ? 'Mikrofonen gick inte att starta' : undefined}
    >
      🎤
    </button>
    <button class="icon" class:on={panelOpen} onclick={() => (panelOpen = !panelOpen)} aria-label="Inställningar">
      ⚙
    </button>
  </div>

  {#if panelOpen}
    <div class="panel">
      <SettingsPanel
        bind:settings
        {loop}
        onSetLoopStart={setLoopStart}
        onSetLoopEnd={setLoopEnd}
        onClearLoop={() => (loop = null)}
      />
    </div>
  {/if}
</div>

<style>
  .screen {
    position: fixed;
    inset: 0;
    background: #14171d;
    overflow: hidden;
    font-family: system-ui, sans-serif;
    user-select: none;
    -webkit-user-select: none;
  }
  .bar {
    position: absolute;
    top: max(8px, env(safe-area-inset-top));
    left: max(8px, env(safe-area-inset-left));
    right: max(8px, env(safe-area-inset-right));
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 10px;
    border-radius: 12px;
    background: rgba(28, 31, 38, 0.7);
    color: #d8d6d1;
    font: 14px system-ui, sans-serif;
    transition: opacity 0.4s;
  }
  /* Fade out while playing to keep the view calm; any interaction brings it back. */
  .bar.dim {
    opacity: 0.25;
  }
  .bar.dim:hover,
  .bar.dim:focus-within {
    opacity: 1;
  }
  .icon {
    flex: none;
    width: 40px;
    height: 40px;
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: inherit;
    font-size: 18px;
    cursor: pointer;
  }
  .icon:hover,
  .icon.on {
    background: #2a2e37;
  }
  .mic {
    filter: grayscale(1);
    opacity: 0.6;
  }
  .mic.on {
    filter: none;
    opacity: 1;
    background: #2f4a3a;
  }
  .mic.error {
    background: #5a2e2e;
  }
  .play {
    background: #2a2e37;
  }
  .time {
    flex: none;
    font-variant-numeric: tabular-nums;
    color: #9c9a95;
  }
  .seek {
    flex: 1;
    min-width: 0;
    accent-color: #5b9bd5;
  }
  .panel {
    position: absolute;
    top: calc(max(8px, env(safe-area-inset-top)) + 60px);
    right: max(8px, env(safe-area-inset-right));
    max-height: calc(100% - 80px);
    overflow-y: auto;
  }
</style>
