<script lang="ts">
  import { onMount } from 'svelte';
  import { RollRenderer, type RollFrame } from '../../render/roll';
  import type { Note } from '../../song/model';

  interface Props {
    notes: readonly Note[];
    /** Called once per animation frame with the elapsed seconds; returns what to draw. */
    frame: (dt: number) => RollFrame;
    onKeyDown?: (midi: number) => void;
    onKeyUp?: (midi: number) => void;
    /** Tap on the note area (above the keyboard). */
    onTap?: () => void;
  }

  let { notes, frame, onKeyDown, onKeyUp, onTap }: Props = $props();
  /** Key held by each active pointer, so multi-touch chords work. */
  const held = new Map<number, number>();

  function pointerDown(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    const midi = renderer?.keyAt(e.clientX - rect.left, e.clientY - rect.top);
    if (midi == null) {
      onTap?.();
      return;
    }
    canvas.setPointerCapture(e.pointerId);
    held.set(e.pointerId, midi);
    onKeyDown?.(midi);
  }

  function pointerUp(e: PointerEvent) {
    const midi = held.get(e.pointerId);
    if (midi == null) return;
    held.delete(e.pointerId);
    onKeyUp?.(midi);
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
      observer.disconnect();
    };
  });
</script>

<canvas bind:this={canvas} onpointerdown={pointerDown} onpointerup={pointerUp} onpointercancel={pointerUp}></canvas>

<style>
  canvas {
    display: block;
    width: 100%;
    height: 100%;
    touch-action: none;
  }
</style>
