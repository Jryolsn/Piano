<script lang="ts">
  import type { LoopRange } from '../../engine/practice';
  import { dragLoopFrom, dragLoopTo } from './loop';
  import { formatTime } from './settings';

  interface Props {
    time: number;
    duration: number;
    loop: LoopRange | null;
    /** While the song plays the bar only shows progress; paused it can be dragged. */
    interactive: boolean;
    onSeek: (seconds: number) => void;
    onLoopChange: (loop: LoopRange) => void;
  }

  let { time, duration, loop, interactive, onSeek, onLoopChange }: Props = $props();

  let track: HTMLDivElement;
  /** What the active pointer drags: the position or a loop pin. */
  let dragging: 'seek' | 'from' | 'to' | null = null;

  const pct = (t: number) => (duration > 0 ? (t / duration) * 100 : 0);

  function timeAt(e: PointerEvent): number {
    const rect = track.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    return f * duration;
  }

  function down(e: PointerEvent, what: 'seek' | 'from' | 'to') {
    e.stopPropagation();
    dragging = what;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (what === 'seek') onSeek(timeAt(e));
  }

  function move(e: PointerEvent) {
    if (!dragging) return;
    const t = timeAt(e);
    if (dragging === 'seek') onSeek(t);
    else if (loop) onLoopChange(dragging === 'from' ? dragLoopFrom(loop, t) : dragLoopTo(loop, t, duration));
  }

  function up() {
    dragging = null;
  }

  /** Arrow keys move the position by a second, so the bar also works without touch. */
  function key(e: KeyboardEvent) {
    const step = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
    if (!step) return;
    e.preventDefault();
    e.stopPropagation();
    onSeek(time + step);
  }
</script>

<div
  class="progress"
  class:interactive
  bind:this={track}
  role="slider"
  tabindex={interactive ? 0 : -1}
  aria-label="Position i låten"
  aria-valuemin={0}
  aria-valuemax={duration}
  aria-valuenow={time}
  onpointerdown={(e) => down(e, 'seek')}
  onpointermove={move}
  onpointerup={up}
  onpointercancel={up}
  onkeydown={key}
>
  <div class="rail"></div>
  <div class="fill" style:width="{pct(time)}%"></div>
  <div class="thumb" style:left="{pct(time)}%"></div>
  {#if loop}
    {#each [{ id: 'from', at: loop.from, name: 'Loopens start' }, { id: 'to', at: loop.to, name: 'Loopens slut' }] as pin (pin.id)}
      <div
        class="pin"
        style:left="{pct(pin.at)}%"
        role="slider"
        tabindex="-1"
        aria-label={pin.name}
        aria-valuenow={pin.at}
        onpointerdown={(e) => down(e, pin.id as 'from' | 'to')}
      >
        <span class="label">{formatTime(pin.at)}</span>
        <span class="stick"></span>
      </div>
    {/each}
  {/if}
</div>

<style>
  .progress {
    position: relative;
    height: 36px;
    pointer-events: none;
    touch-action: none;
    outline: none;
  }
  .progress.interactive {
    pointer-events: auto;
    cursor: pointer;
  }
  .rail,
  .fill {
    position: absolute;
    top: 26px;
    height: 4px;
    margin-top: -2px;
    border-radius: 2px;
  }
  .rail {
    left: 0;
    right: 0;
    background: rgba(255, 255, 255, 0.14);
  }
  .fill {
    left: 0;
    background: #5b9bd5;
  }
  .thumb {
    position: absolute;
    top: 26px;
    width: 12px;
    height: 12px;
    margin: -6px 0 0 -6px;
    border-radius: 50%;
    background: #d8d6d1;
    opacity: 0;
    transition: opacity 0.15s;
  }
  .interactive .thumb {
    opacity: 1;
  }
  .progress:focus-visible .thumb {
    outline: 2px solid #5b9bd5;
  }
  /* A thin pin with its time on top; the wide transparent box makes it easy to grab. */
  .pin {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 40px;
    margin-left: -20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: ew-resize;
    touch-action: none;
  }
  .interactive .pin {
    pointer-events: auto;
  }
  .label {
    font: 600 11px/14px system-ui, sans-serif;
    font-variant-numeric: tabular-nums;
    color: #e8a94a;
  }
  .stick {
    flex: 1;
    width: 3px;
    border-radius: 2px;
    background: #e8a94a;
  }
</style>
