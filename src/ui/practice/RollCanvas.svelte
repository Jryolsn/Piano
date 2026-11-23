<script lang="ts">
  import { onMount } from 'svelte';
  import { RollRenderer, type RollFrame } from '../../render/roll';
  import { dragToSeconds } from '../../render/timeline';
  import { isTap, TAP_MAX_DISTANCE } from './gestures';
  import type { Note } from '../../song/model';

  interface Props {
    notes: readonly Note[];
    /** Called once per animation frame with the elapsed seconds; returns what to draw. */
    frame: (dt: number) => RollFrame;
    onKeyDown?: (midi: number) => void;
    onKeyUp?: (midi: number) => void;
    /** Seconds visible above the hit line, which sets how far a drag moves the song. */
    lookahead: number;
    /** Short tap on the note area (above the keyboard); never fires for a drag or a long press. */
    onTap?: () => void;
    /** Dragging or wheeling over the note area: `start`, then `move` with the song seconds to shift by, then `end`. */
    onScrub?: (phase: 'start' | 'move' | 'end', seconds?: number) => void;
  }

  let { notes, frame, lookahead, onKeyDown, onKeyUp, onTap, onScrub }: Props = $props();
  /** Key held by each active pointer, so multi-touch chords work. */
  const held = new Map<number, number>();

  /** Wheel lines are converted to pixels with this factor. */
  const WHEEL_LINE_PX = 16;
  /** The wheel counts as released after this many ms without events. */
  const WHEEL_IDLE_MS = 180;

  /** The pointer dragging the note area, if any. */
  let drag: { id: number; startX: number; startY: number; lastY: number; startedAt: number; moved: boolean } | null = null;
  let wheelTimer: ReturnType<typeof setTimeout> | undefined;

  function secondsFor(dy: number): number {
    return dragToSeconds(dy, lookahead, renderer?.hitLineY() ?? 0);
  }

  function pointerDown(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    const midi = renderer?.keyAt(e.clientX - rect.left, e.clientY - rect.top);
    canvas.setPointerCapture(e.pointerId);
    if (midi == null) {
      drag ??= {
        id: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        lastY: e.clientY,
        startedAt: e.timeStamp,
        moved: false,
      };
      return;
    }
    held.set(e.pointerId, midi);
    onKeyDown?.(midi);
  }

  function pointerMove(e: PointerEvent) {
    if (!drag || drag.id !== e.pointerId) return;
    if (!drag.moved) {
      if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < TAP_MAX_DISTANCE) return;
      drag.moved = true;
      onScrub?.('start');
    }
    onScrub?.('move', secondsFor(e.clientY - drag.lastY));
    drag.lastY = e.clientY;
  }

  function pointerUp(e: PointerEvent) {
    if (drag?.id === e.pointerId) {
      const { moved, startX, startY, startedAt } = drag;
      drag = null;
      if (moved) onScrub?.('end');
      else if (e.type === 'pointerup' && isTap(e.clientX - startX, e.clientY - startY, e.timeStamp - startedAt)) onTap?.();
      return;
    }
    const midi = held.get(e.pointerId);
    if (midi == null) return;
    held.delete(e.pointerId);
    onKeyUp?.(midi);
  }

  /** Content follows the wheel: scrolling down moves the notes up, which is back in the song. */
  function wheel(e: WheelEvent) {
    if (wheelTimer === undefined) onScrub?.('start');
    else clearTimeout(wheelTimer);
    const px = e.deltaMode === WheelEvent.DOM_DELTA_LINE ? e.deltaY * WHEEL_LINE_PX : e.deltaY;
    onScrub?.('move', secondsFor(-px));
    wheelTimer = setTimeout(() => {
      wheelTimer = undefined;
      onScrub?.('end');
    }, WHEEL_IDLE_MS);
  }
  let canvas: HTMLCanvasElement;
  let renderer: RollRenderer | undefined;

  $effect(() => {
    renderer?.setSong(notes);
  });

  onMount(() => {
    const r = new RollRenderer(canvas);
    renderer = r;
    r.setSong(notes);

    const observer = new ResizeObserver(() => {
      r.resize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio || 1);
    });
    observer.observe(canvas);

    let last = performance.now();
    let raf = requestAnimationFrame(function loop(now) {
      // Clamp so a backgrounded tab does not jump the song forward.
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      r.draw(frame(dt));
      raf = requestAnimationFrame(loop);
    });

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(wheelTimer);
      observer.disconnect();
    };
  });
</script>

<canvas
  bind:this={canvas}
  onpointerdown={pointerDown}
  onpointermove={pointerMove}
  onpointerup={pointerUp}
  onpointercancel={pointerUp}
  onwheel={wheel}
></canvas>

<style>
  canvas {
    display: block;
    width: 100%;
    height: 100%;
    touch-action: none;
  }
</style>
