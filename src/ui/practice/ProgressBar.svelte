<script lang="ts">
  import type { LoopRange } from '../../engine/practice';
  import { dragLoopFrom, dragLoopTo } from './loop';

  interface Props {
    time: number;
    duration: number;
    loop: LoopRange | null;
    onSeek: (seconds: number) => void;
    onLoopChange: (loop: LoopRange) => void;
  }

  let { time, duration, loop, onSeek, onLoopChange }: Props = $props();

  let track: HTMLDivElement;
  /** What the active pointer drags: the position or a loop handle. */
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
  bind:this={track}
  role="slider"
  tabindex="0"
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
  {#if loop}
    <div class="range" style:left="{pct(loop.from)}%" style:width="{pct(loop.to - loop.from)}%"></div>
  {/if}
  <div class="fill" style:width="{pct(time)}%"></div>
  <div class="thumb" style:left="{pct(time)}%"></div>
  {#if loop}
    <div
      class="handle from"
      style:left="{pct(loop.from)}%"
      role="slider"
      tabindex="-1"
      aria-label="Loopens start"
      aria-valuenow={loop.from}
      onpointerdown={(e) => down(e, 'from')}
    ></div>
    <div
      class="handle to"
      style:left="{pct(loop.to)}%"
      role="slider"
      tabindex="-1"
      aria-label="Loopens slut"
      aria-valuenow={loop.to}
      onpointerdown={(e) => down(e, 'to')}
    ></div>
  {/if}
</div>

<style>
  .progress {
    position: relative;
    flex: 1;
    min-width: 0;
    height: 52px;
    margin: 0 12px;
    touch-action: none;
    cursor: pointer;
    outline: none;
  }
  .rail,
  .range,
  .fill {
    position: absolute;
    top: 50%;
    height: 8px;
    margin-top: -4px;
    border-radius: 4px;
    pointer-events: none;
  }
  .rail {
    left: 0;
    right: 0;
    background: #2a2e37;
  }
  .range {
    height: 20px;
    margin-top: -10px;
    border-radius: 6px;
    background: rgba(232, 169, 74, 0.28);
  }
  .fill {
    left: 0;
    background: #5b9bd5;
  }
  .thumb {
    position: absolute;
    top: 50%;
    width: 16px;
    height: 16px;
    margin: -8px 0 0 -8px;
    border-radius: 50%;
    background: #d8d6d1;
    pointer-events: none;
  }
  .progress:focus-visible .thumb {
    outline: 2px solid #5b9bd5;
  }
  /* Bracket-shaped handles sit outside the range, so they never overlap; the transparent edge widens the touch target. */
  .handle {
    position: absolute;
    top: 4px;
    bottom: 4px;
    width: 28px;
    cursor: ew-resize;
    touch-action: none;
  }
  .handle::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    width: 10px;
    background: #e8a94a;
  }
  .handle.from {
    margin-left: -28px;
  }
  .handle.from::before {
    right: 0;
    border-radius: 6px 0 0 6px;
  }
  .handle.to::before {
    left: 0;
    border-radius: 0 6px 6px 0;
  }
</style>
