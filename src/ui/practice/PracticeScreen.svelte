<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { createFrameSource, openMic, type FrameSource } from '../../audio/mic';
  import { PracticeListener } from '../../audio/practice-listener';
  import { FftVerifier } from '../../audio/verifier';
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
  const listener = new PracticeListener(new FftVerifier());

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
    else {
      // Wait mode needs to hear the piano, so start listening on the first play.
      if (settings.mode === 'wait' && mic === 'off') void toggleMic();
      session.play();
    }
    playing = session.playing;
    if (playing) panelOpen = false;
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
  <RollCanvas notes={song.notes} {frame} onKeyDown={keyDown} onKeyUp={keyUp} onTap={() => playing && togglePlay()} />

  {#if playing}
    <!-- While playing only the notes and keys are shown; tap anywhere above the keys to pause. -->
    <button class="round pause" onclick={togglePlay} aria-label="Pausa">❚❚</button>
  {:else}
    <div class="bar">
      {#if onExit}
        <button class="round" onclick={onExit} aria-label="Tillbaka">‹</button>
      {/if}
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
        class="round mic"
        class:on={mic === 'on'}
        class:error={mic === 'error'}
        onclick={toggleMic}
        disabled={mic === 'starting'}
        aria-label={mic === 'on' ? 'Stäng av mikrofonen' : 'Lyssna med mikrofonen'}
        title={mic === 'error' ? 'Mikrofonen gick inte att starta' : undefined}
      >
        🎤
      </button>
      <button class="round" class:on={panelOpen} onclick={() => (panelOpen = !panelOpen)} aria-label="Inställningar">
        ⚙
      </button>
    </div>

    <button class="play" onclick={togglePlay} aria-label="Spela">▶</button>
    <p class="title">{song.title}</p>

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
  {/if}
</div>

<style>
  .screen {
    position: fixed;
    inset: 0;
    background: #14171d;
    overflow: hidden;
    font-family: system-ui, sans-serif;
    color: #d8d6d1;
    user-select: none;
    -webkit-user-select: none;
  }
  .bar {
    position: absolute;
    top: max(10px, env(safe-area-inset-top));
    left: max(10px, env(safe-area-inset-left));
    right: max(10px, env(safe-area-inset-right));
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px;
    border-radius: 16px;
    background: rgba(28, 31, 38, 0.85);
    font-size: 15px;
  }
  .round {
    flex: none;
    width: 52px;
    height: 52px;
    border: 0;
    border-radius: 50%;
    background: #2a2e37;
    color: inherit;
    font-size: 22px;
    cursor: pointer;
  }
  .round.on {
    background: #3d5f80;
  }
  .pause {
    position: absolute;
    top: max(10px, env(safe-area-inset-top));
    right: max(10px, env(safe-area-inset-right));
    font-size: 16px;
    background: rgba(42, 46, 55, 0.6);
    opacity: 0.5;
  }
  .mic {
    filter: grayscale(1);
  }
  .mic.on {
    filter: none;
    background: #2f4a3a;
  }
  .mic.error {
    background: #5a2e2e;
  }
  .play {
    position: absolute;
    left: 50%;
    top: 42%;
    transform: translate(-50%, -50%);
    width: 96px;
    height: 96px;
    padding-left: 8px;
    border: 0;
    border-radius: 50%;
    background: #5b9bd5;
    color: #10131a;
    font-size: 40px;
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4);
    cursor: pointer;
  }
  .title {
    position: absolute;
    left: 50%;
    top: calc(42% + 64px);
    transform: translateX(-50%);
    margin: 0;
    max-width: 90%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 17px;
    color: #c9c7c2;
    text-shadow: 0 1px 6px rgba(0, 0, 0, 0.8);
    pointer-events: none;
  }
  .time {
    flex: none;
    font-variant-numeric: tabular-nums;
    color: #9c9a95;
  }
  .seek {
    flex: 1;
    min-width: 0;
    height: 32px;
    accent-color: #5b9bd5;
  }
  .panel {
    position: absolute;
    top: calc(max(10px, env(safe-area-inset-top)) + 72px);
    right: max(10px, env(safe-area-inset-right));
    max-height: calc(100% - 92px);
    overflow-y: auto;
    border-radius: 14px;
  }
</style>
