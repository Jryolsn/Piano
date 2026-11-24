<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { createFrameSource, openMic, type FrameSource } from '../../audio/mic';
  import { Piano } from '../../audio/piano';
  import { PracticeListener } from '../../audio/practice-listener';
  import { SongPlayer } from '../../audio/song-player';
  import { FftVerifier } from '../../audio/verifier';
  import { PracticeSession, type LoopRange } from '../../engine/practice';
  import type { RollFrame } from '../../render/roll';
  import { keyRangeFor } from '../../render/keyboard';
  import { createKeepAwake } from '../../platform/keep-awake';
  import type { Song } from '../../song/model';
  import RollCanvas from './RollCanvas.svelte';
  import ModePicker from './ModePicker.svelte';
  import SettingsPanel from './SettingsPanel.svelte';
  import ProgressBar from './ProgressBar.svelte';
  import Icon from '../Icon.svelte';
  import { startLoop } from './loop';
  import {
    defaultSettings,
    engineModeFor,
    formatTime,
    handsFor,
    loadSongMode,
    playsSound,
    saveSongMode,
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
  /** The song was playing when the user started dragging the notes, so it resumes on release. */
  let resumeAfterScrub = $state(false);
  let scrubbing = false;
  let heardKeys: readonly number[] = [];
  let heardUntil = 0;
  let hitKeys: readonly number[] = [];
  let hitUntil = 0;
  let micSource: FrameSource | null = null;
  const listener = new PracticeListener(new FftVerifier());
  const piano = new Piano();

  const session = $derived(new PracticeSession(song));
  // Only the practiced hand is heard.
  const player = $derived(new SongPlayer(song.notes.filter((n) => handsFor(settings.hand).includes(n.hand)), piano));
  const audible = $derived(playsSound(settings.mode));

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

  $effect(() => {
    const { low, high } = keyRangeFor(song.notes);
    listener.setCandidates(Array.from({ length: high - low + 1 }, (_, i) => low + i));
  });

  function frame(dt: number): RollFrame {
    const s = untrack(() => session);
    s.tick(dt);
    untrack(() => player.update(s.time, s.options.tempo, s.playing && audible));
    if (micSource) {
      if (listener.process(micSource.read(), micSource.sampleRate, s)) flashHit(listener.played);
      if (listener.heard.length > 0) {
        heardKeys = listener.heard;
        heardUntil = performance.now() + HEARD_MARKER_MS;
      }
    }
    time = s.time;
    playing = s.playing;
    return {
      time: s.time,
      lookahead: untrack(() => settings.lookahead),
      hands: s.options.hands,
      loop: s.options.loop,
      expected: s.waiting ? s.expected() : undefined,
      pressed: untrack(() => (performance.now() < heardUntil ? [...pressed, ...heardKeys] : pressed)),
      judged: untrack(() => usesMic(settings.mode)),
      hit: performance.now() < hitUntil ? hitKeys : undefined,
      resultOf: (n) => s.resultOf(n),
    };
  }

  /** How long a key heard by the mic stays marked. */
  const HEARD_MARKER_MS = 500;
  /** How long a correctly played key lights up at least. */
  const HIT_FLASH_MS = 400;

  function flashHit(midi: readonly number[]) {
    hitKeys = midi;
    hitUntil = performance.now() + HIT_FLASH_MS;
  }

  /** While the song runs only the notes, keys and a slim progress bar are shown. */
  const shown = $derived(playing || resumeAfterScrub);
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

  /** Dragging the notes moves the song; it stays paused meanwhile and resumes if it was playing. */
  function scrub(phase: 'start' | 'move' | 'end', seconds = 0) {
    if (phase === 'start') {
      scrubbing = true;
      resumeAfterScrub = session.playing;
      session.pause();
      playing = false;
    } else if (phase === 'move') {
      if (scrubbing) seek(session.time + seconds);
    } else if (scrubbing) {
      scrubbing = false;
      const resume = resumeAfterScrub && session.time < song.duration;
      resumeAfterScrub = false;
      if (resume) togglePlay();
    }
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
      settings.mode = 'listen';
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

  /** Tapping the note area toggles play and pause; at the start and the end the buttons choose what to do. */
  function tapBoard() {
    if (!atStart && !ended) togglePlay();
  }

  /** Opening the settings pauses the song; it stays paused when they close. */
  function openSettings() {
    if (session.playing) {
      session.pause();
      playing = false;
    }
    panelOpen = true;
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
  <RollCanvas
    notes={song.notes}
    {frame}
    lookahead={settings.lookahead}
    onKeyDown={keyDown}
    onKeyUp={keyUp}
    onTap={tapBoard}
    onScrub={scrub}
  />

  <div class="top">
    <ProgressBar
      {time}
      duration={song.duration}
      {loop}
      interactive={!shown}
      onSeek={seek}
      onLoopChange={(l) => (loop = l)}
    />
    {#if !shown}
      <div class="controls">
        {#if onExit}
          <button class="round" onclick={onExit} aria-label="Tillbaka"><Icon name="back" /></button>
        {/if}
        {#if !atStart && !ended}
          <button class="round go" onclick={togglePlay} aria-label="Spela"><Icon name="play" /></button>
        {/if}
        <span class="time">{formatTime(time)} / {formatTime(song.duration)}</span>
        <span class="spacer"></span>
        <button class="round" class:on={panelOpen} onclick={() => (panelOpen ? (panelOpen = false) : openSettings())} aria-label="Inställningar">
          <Icon name="settings" />
        </button>
      </div>
    {/if}
  </div>

  {#if !shown}
    {#if ended}
      <div class="center">
        <p class="title">{summary && summary.hit + summary.missed > 0 && settings.mode === 'along'
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
        <ModePicker selected={settings.mode} onPick={start} />
        {#if mic === 'error'}<p class="note">Mikrofonen gick inte att starta. Låten spelas utan att lyssna.</p>{/if}
      </div>
    {:else}
      <div class="center passive">
        <p class="title">{song.title}</p>
        <p class="hint">Tryck på brädet för att fortsätta</p>
      </div>
    {/if}

    {#if panelOpen}
      <div class="panel">
        <SettingsPanel
          bind:settings
          looping={!!loop}
          onToggleLoop={() => (loop = loop ? null : startLoop(time, song.duration))}
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
  .top {
    position: absolute;
    top: max(8px, env(safe-area-inset-top));
    left: max(24px, env(safe-area-inset-left));
    right: max(24px, env(safe-area-inset-right));
  }
  .controls {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 6px;
  }
  .spacer {
    flex: 1;
  }
  .round {
    flex: none;
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: rgba(42, 46, 55, 0.9);
    color: inherit;
    cursor: pointer;
  }
  .round.on {
    background: #3d5f80;
  }
  .round.go {
    padding-left: 2px;
    background: #5b9bd5;
    color: #10131a;
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
  /* Lets taps through to the board, which resumes the song. */
  .center.passive {
    pointer-events: none;
  }
  .note {
    margin: 0;
    font-size: 14px;
    color: #c9a27a;
    text-align: center;
  }
  .time {
    font-variant-numeric: tabular-nums;
    color: #9c9a95;
    font-size: 15px;
  }
  .hint {
    margin: 0;
    font-size: 14px;
    color: #8d8b86;
    text-shadow: 0 1px 6px rgba(0, 0, 0, 0.8);
    pointer-events: none;
  }
  .panel {
    position: absolute;
    top: calc(max(8px, env(safe-area-inset-top)) + 100px);
    right: max(10px, env(safe-area-inset-right));
    max-height: calc(100% - 120px);
    overflow-y: auto;
    border-radius: 14px;
  }
</style>
