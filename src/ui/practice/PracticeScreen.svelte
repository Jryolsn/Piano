<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { createFrameSource, openMic, type FrameSource } from '../../audio/mic';
  import { Piano } from '../../audio/piano';
  import { PracticeListener } from '../../audio/practice-listener';
  import { SongPlayer } from '../../audio/song-player';
  import { FftVerifier } from '../../audio/verifier';
  import { PracticeSession, type LoopRange } from '../../engine/practice';
  import type { RollFrame } from '../../render/roll';
  import { createKeepAwake } from '../../platform/keep-awake';
  import type { Song } from '../../song/model';
  import RollCanvas from './RollCanvas.svelte';
  import SettingsPanel from './SettingsPanel.svelte';
  import {
    defaultSettings,
    engineModeFor,
    formatTime,
    handsFor,
    loadSongMode,
    loadSound,
    playsSound,
    saveSongMode,
    saveSound,
    songModes,
    usesMic,
    type PracticeSettings,
    type SongMode,
  } from './settings';

  interface Props {
    song: Song;
    onExit?: () => void;
  }

  let { song, onExit }: Props = $props();

  let settings = $state<PracticeSettings>({ ...defaultSettings, mode: loadSongMode() });
  let loop = $state<LoopRange | null>(null);
  let panelOpen = $state(false);
  let time = $state(0);
  let playing = $state(false);
  let pressed = $state<number[]>([]);
  let mic = $state<'off' | 'starting' | 'on' | 'error'>('off');
  let soundOn = $state(loadSound());
  let hitKeys: readonly number[] = [];
  let hitUntil = 0;
  let micSource: FrameSource | null = null;
  const listener = new PracticeListener(new FftVerifier());
  const piano = new Piano();

  const session = $derived(new PracticeSession(song));
  // Only the practiced hand is heard.
  const player = $derived(new SongPlayer(song.notes.filter((n) => handsFor(settings.hand).includes(n.hand)), piano));
  const audible = $derived(playsSound(settings.mode, soundOn));

  $effect(() => {
    session.setOptions({
      ...engineModeFor(settings.mode),
      tempo: settings.tempo,
      hands: handsFor(settings.hand),
      loop,
    });
    listener.reset();
    piano.stopAll();
  });

  function frame(dt: number): RollFrame {
    const s = untrack(() => session);
    s.tick(dt);
    untrack(() => player.update(s.time, s.options.tempo, s.playing && audible));
    if (micSource && listener.process(micSource.read(), micSource.sampleRate, s)) flashHit(listener.played);
    time = s.time;
    playing = s.playing;
    return {
      time: s.time,
      lookahead: untrack(() => settings.lookahead),
      hands: s.options.hands,
      expected: s.waiting ? s.expected() : undefined,
      pressed: untrack(() => pressed),
      hit: performance.now() < hitUntil ? hitKeys : undefined,
      resultOf: (n) => s.resultOf(n),
    };
  }

  /** How long a correctly played key lights up. */
  const HIT_FLASH_MS = 400;

  function flashHit(midi: readonly number[]) {
    hitKeys = midi;
    hitUntil = performance.now() + HIT_FLASH_MS;
  }

  const atStart = $derived(time === 0);
  const ended = $derived(!playing && time >= song.duration);
  const summary = $derived(ended ? session.summary() : null);

  /** Starts the song in the chosen mode; runs from a tap, so the mic may be opened. */
  function start(mode: SongMode) {
    settings.mode = mode;
    saveSongMode(mode);
    if (ended) seek(loop?.from ?? 0);
    togglePlay();
  }

  function togglePlay() {
    if (session.playing) session.pause();
    else {
      if (usesMic(settings.mode) && mic !== 'on') void startMic();
      else if (!usesMic(settings.mode)) void stopMic();
      void piano.resume();
      session.play();
    }
    playing = session.playing;
    if (playing) panelOpen = false;
  }

  function seek(to: number) {
    session.seek(Math.min(song.duration, Math.max(0, to)));
    time = session.time;
    listener.reset();
    player.reset();
  }

  function toggleSound() {
    soundOn = !soundOn;
    saveSound(soundOn);
  }

  /** Must run from a user gesture: browsers only allow audio and mic access then. */
  async function startMic() {
    if (mic === 'starting') return;
    mic = 'starting';
    try {
      micSource = createFrameSource(await openMic());
      listener.reset();
      mic = 'on';
    } catch {
      // Without the mic the song still runs, just without listening.
      mic = 'error';
      settings.mode = 'play';
    }
  }

  async function stopMic() {
    const src = micSource;
    micSource = null;
    if (mic !== 'error') mic = 'off';
    await src?.close();
  }

  const TAP_NOTE_SECONDS = 1;

  /** Keys tapped recently count together, so chords can be tapped one key at a time with a mouse. */
  const CHORD_WINDOW_MS = 1500;
  const tappedAt = new Map<number, number>();

  function keyDown(midi: number) {
    pressed = [...pressed, midi];
    if (audible) piano.play(midi, piano.currentTime, TAP_NOTE_SECONDS);
    const now = performance.now();
    tappedAt.set(midi, now);
    const expected = session.expected();
    if (expected.length > 0 && expected.every((m) => now - (tappedAt.get(m) ?? -Infinity) <= CHORD_WINDOW_MS)) {
      flashHit(expected);
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
    // Keep the screen on for the whole song screen, also while paused between tries.
    const keepAwake = createKeepAwake();
    void keepAwake.acquire();
    // Without samples (e.g. offline before the first load) the song simply runs silently.
    piano.load().catch(() => {});
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
      void keepAwake.release();
      session.pause();
      void micSource?.close();
      micSource = null;
      void piano.close();
    };
  });
</script>

<div class="screen">
  <RollCanvas notes={song.notes} {frame} onKeyDown={keyDown} onKeyUp={keyUp} onTap={() => playing && togglePlay()} />

  {#snippet soundButton(cls: string)}
    <button class="round {cls}" class:off={!soundOn} onclick={toggleSound} aria-label={soundOn ? 'Stäng av ljud' : 'Sätt på ljud'}>
      {soundOn ? '🔊' : '🔇'}
    </button>
  {/snippet}

  {#if playing}
    <!-- While playing only the notes and keys are shown; tap anywhere above the keys to pause. -->
    <div class="corner">
      {#if !usesMic(settings.mode)}{@render soundButton('faint')}{/if}
      <button class="round faint" onclick={togglePlay} aria-label="Pausa">❚❚</button>
    </div>
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
      {#if !usesMic(settings.mode)}{@render soundButton('')}{/if}
      <button class="round" class:on={panelOpen} onclick={() => (panelOpen = !panelOpen)} aria-label="Inställningar">
        ⚙
      </button>
    </div>

    {#if ended}
      <div class="center">
        <p class="title">{summary && summary.hit + summary.missed > 0 && settings.mode === 'listen'
            ? `${summary.hit} av ${summary.hit + summary.missed} rätt`
            : 'Klart!'}</p>
        <div class="choices">
          <button class="choice" onclick={() => start(settings.mode)}>Igen</button>
          {#if onExit}<button class="choice" onclick={onExit}>Tillbaka</button>{/if}
        </div>
      </div>
    {:else if atStart}
      <div class="center">
        <p class="title">{song.title}</p>
        <div class="choices">
          {#each songModes as m (m.value)}
            <button class="choice" class:on={settings.mode === m.value} onclick={() => start(m.value)}>
              <span class="icon" aria-hidden="true">{m.icon}</span>{m.label}
            </button>
          {/each}
        </div>
        {#if mic === 'error'}<p class="note">Mikrofonen gick inte att starta. Låten spelas utan att lyssna.</p>{/if}
      </div>
    {:else}
      <button class="play" onclick={togglePlay} aria-label="Spela">▶</button>
      <p class="title below">{song.title}</p>
    {/if}

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
  .round.off {
    opacity: 0.6;
  }
  .corner {
    position: absolute;
    top: max(10px, env(safe-area-inset-top));
    right: max(10px, env(safe-area-inset-right));
    display: flex;
    gap: 10px;
  }
  .faint {
    font-size: 16px;
    background: rgba(42, 46, 55, 0.6);
    opacity: 0.5;
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
    margin: 0;
    max-width: 90vw;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 17px;
    color: #c9c7c2;
    text-shadow: 0 1px 6px rgba(0, 0, 0, 0.8);
    pointer-events: none;
  }
  .title.below {
    position: absolute;
    left: 50%;
    top: calc(42% + 64px);
    transform: translateX(-50%);
  }
  .center {
    position: absolute;
    left: 50%;
    top: 42%;
    transform: translate(-50%, -50%);
    display: grid;
    justify-items: center;
    gap: 14px;
    width: min(560px, calc(100vw - 32px));
  }
  .choices {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
    width: 100%;
  }
  .choice {
    flex: 1 1 140px;
    display: grid;
    justify-items: center;
    align-content: center;
    gap: 6px;
    min-height: 88px;
    padding: 12px;
    border: 0;
    border-radius: 16px;
    background: rgba(42, 46, 55, 0.95);
    color: inherit;
    font: inherit;
    font-size: 17px;
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4);
    cursor: pointer;
  }
  .choice.on {
    background: #5b9bd5;
    color: #10131a;
  }
  .icon {
    font-size: 24px;
    line-height: 1;
  }
  .note {
    margin: 0;
    font-size: 14px;
    color: #c9a27a;
    text-align: center;
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
