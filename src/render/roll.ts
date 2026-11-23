import type { LoopRange, StepResult } from '../engine/practice';
import type { Hand, Note } from '../song/model';
import { isBlack, keyRangeFor, layoutKeys, type KeyRange, type KeyRect } from './keyboard';
import { theme } from './theme';
import { firstVisibleIndex, nextOnset, timeToY } from './timeline';

export interface RollFrame {
  /** Current song position in seconds. */
  time: number;
  /** Seconds of music visible above the hit line. */
  lookahead: number;
  /** Hands being practiced; other notes are drawn faded. */
  hands: readonly Hand[];
  /** MIDI numbers the player must play now (wait mode); emphasised on the keyboard. */
  expected?: readonly number[];
  /** MIDI numbers currently played by the player (touch or detected), marked on the keyboard. */
  pressed?: readonly number[];
  /** The player is being judged, so a played key that is not right is marked as wrong. */
  judged?: boolean;
  /** MIDI numbers just played correctly; flashed on the keyboard. */
  hit?: readonly number[];
  /** Practiced loop; its start and end are marked as lines across the roll. */
  loop?: LoopRange | null;
  /** Step result per note, for hit/missed feedback. */
  resultOf?: (note: Note) => StepResult | undefined;
}

/** Share of the canvas height used by the keyboard. */
const KEYBOARD_RATIO = 0.16;
const MAX_KEYBOARD_PX = 160;
const BLACK_KEY_RATIO = 0.62;
const NOTE_RADIUS = 4;
const NOTE_GAP = 1;
const GLOW_BLUR = 18;
const MARKER_SIZE = 8;

/** Falling-note piano roll drawn on a 2D canvas. Call `draw` once per animation frame. */
export class RollRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private notes: readonly Note[] = [];
  private maxDuration = 0;
  private range: KeyRange = keyRangeFor([]);
  private keys: KeyRect[] = [];
  private keyByMidi = new Map<number, KeyRect>();
  private cssWidth = 0;
  private cssHeight = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D is not supported');
    this.ctx = ctx;
  }

  setSong(notes: readonly Note[]): void {
    this.notes = notes;
    this.maxDuration = notes.reduce((m, n) => Math.max(m, n.duration), 0);
    this.range = keyRangeFor(notes);
    this.relayout();
  }

  /** Match the backing store to the element's CSS size and device pixel ratio. */
  resize(cssWidth: number, cssHeight: number, pixelRatio: number): void {
    this.cssWidth = cssWidth;
    this.cssHeight = cssHeight;
    this.canvas.width = Math.round(cssWidth * pixelRatio);
    this.canvas.height = Math.round(cssHeight * pixelRatio);
    this.ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    this.relayout();
  }

  draw(frame: RollFrame): void {
    const { ctx, cssWidth: w, cssHeight: h } = this;
    if (w === 0 || h === 0) return;
    const keyboardHeight = this.keyboardHeight();
    const hitY = h - keyboardHeight;

    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, w, h);
    this.drawLanes(hitY);
    const { sounding, lit } = this.drawNotes(frame, hitY);
    if (frame.loop) this.drawLoop(frame, frame.loop, hitY);
    this.drawKeyboard(frame, hitY, keyboardHeight, sounding, lit);
  }

  /** Y of the hit line in CSS pixels. */
  hitLineY(): number {
    return this.cssHeight - this.keyboardHeight();
  }

  /** MIDI number of the keyboard key at a CSS-pixel point, or null outside the keyboard. */
  keyAt(x: number, y: number): number | null {
    const top = this.cssHeight - this.keyboardHeight();
    if (y < top) return null;
    const blackBottom = top + this.keyboardHeight() * BLACK_KEY_RATIO;
    // Black keys sit on top, so they win where they overlap white keys.
    for (let i = this.keys.length - 1; i >= 0; i--) {
      const k = this.keys[i]!;
      if (k.black && y > blackBottom) continue;
      if (x >= k.x && x < k.x + k.width) return k.midi;
    }
    return null;
  }

  private keyboardHeight(): number {
    return Math.min(MAX_KEYBOARD_PX, this.cssHeight * KEYBOARD_RATIO);
  }

  private relayout(): void {
    this.keys = layoutKeys(this.range, this.cssWidth);
    this.keyByMidi = new Map(this.keys.map((k) => [k.midi, k]));
  }

  private drawLanes(hitY: number): void {
    const { ctx } = this;
    for (const k of this.keys) {
      if (k.black) continue;
      ctx.fillStyle = k.midi % 12 === 0 ? theme.octaveLine : theme.laneLine;
      ctx.fillRect(Math.round(k.x), 0, 1, hitY);
    }
  }

  /** Draws visible notes; returns the keys sounding by hand, and those sounding after being played right. */
  private drawNotes(frame: RollFrame, hitY: number): { sounding: Map<number, Hand>; lit: Set<number> } {
    const { ctx, notes } = this;
    const { time, lookahead, hands } = frame;
    const until = time + lookahead;
    const sounding = new Map<number, Hand>();
    const lit = new Set<number>();

    // Black-key notes last so they stay visible over adjacent white-key notes.
    for (const pass of [false, true]) {
      for (let i = firstVisibleIndex(notes, time, this.maxDuration); i < notes.length; i++) {
        const n = notes[i]!;
        if (n.time >= until) break;
        const end = n.time + n.duration;
        if (end <= time || isBlack(n.midi) !== pass) continue;
        const key = this.keyByMidi.get(n.midi);
        if (!key) continue;

        const practiced = hands.includes(n.hand);
        const active = n.time <= time;
        const result = practiced ? frame.resultOf?.(n) : undefined;
        const glowing = active && result === 'hit';
        if (active && practiced) sounding.set(n.midi, n.hand);
        if (glowing) lit.add(n.midi);

        const bottom = Math.min(hitY, timeToY(n.time, time, lookahead, hitY));
        const top = Math.max(0, timeToY(end, time, lookahead, hitY));
        const colors = theme.hand[n.hand];
        ctx.globalAlpha = !practiced ? theme.otherHandAlpha : result === 'missed' ? theme.missedAlpha : 1;
        ctx.fillStyle = result === 'hit' ? theme.hit : active ? colors.active : colors.note;
        if (glowing) {
          ctx.shadowColor = theme.glow;
          ctx.shadowBlur = GLOW_BLUR;
        }
        roundRect(ctx, key.x + NOTE_GAP, top, key.width - NOTE_GAP * 2, bottom - top - NOTE_GAP, NOTE_RADIUS);
        ctx.shadowBlur = 0;
      }
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = theme.hitLine;
    ctx.fillRect(0, hitY - 1, this.cssWidth, 2);
    return { sounding, lit };
  }

  /** Dashed lines where the loop starts and ends, so the stop is seen coming. */
  private drawLoop(frame: RollFrame, loop: LoopRange, hitY: number): void {
    const { ctx, cssWidth: w } = this;
    ctx.save();
    ctx.strokeStyle = theme.loop;
    ctx.fillStyle = theme.loop;
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 6]);
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.textBaseline = 'bottom';
    for (const [t, label, align] of [[loop.from, 'Start', 'left'], [loop.to, 'Stopp', 'right']] as const) {
      const y = timeToY(t, frame.time, frame.lookahead, hitY);
      if (y < 0 || y > hitY) continue;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
      ctx.textAlign = align;
      ctx.fillText(label, align === 'left' ? 8 : w - 8, y - 4);
    }
    ctx.restore();
  }

  private drawKeyboard(frame: RollFrame, top: number, height: number, sounding: Map<number, Hand>, lit: Set<number>): void {
    const { ctx } = this;
    const hint = new Map<number, Hand>();
    for (const n of nextOnset(this.notes, frame.time, frame.hands)) {
      if (n.time - frame.time <= frame.lookahead) hint.set(n.midi, n.hand);
    }
    const expected = new Set(frame.expected ?? []);
    const pressed = new Set(frame.pressed ?? []);
    const hit = new Set(frame.hit ?? []);
    const blackHeight = height * BLACK_KEY_RATIO;

    for (const k of this.keys) {
      const keyHeight = k.black ? blackHeight : height;
      ctx.fillStyle = k.black ? theme.blackKey : theme.whiteKey;
      ctx.fillRect(k.x, top, k.width, keyHeight);

      const hand = sounding.get(k.midi) ?? hint.get(k.midi);
      if (hand) {
        ctx.globalAlpha = sounding.has(k.midi) ? 1 : theme.hintAlpha;
        ctx.fillStyle = theme.hand[hand].note;
        ctx.fillRect(k.x, top, k.width, keyHeight);
        ctx.globalAlpha = 1;
      }
      if (hit.has(k.midi) || lit.has(k.midi)) {
        ctx.fillStyle = theme.hit;
        ctx.shadowColor = theme.glow;
        ctx.shadowBlur = lit.has(k.midi) ? GLOW_BLUR : 0;
        ctx.fillRect(k.x, top, k.width, keyHeight);
        ctx.shadowBlur = 0;
      }
      if (pressed.has(k.midi)) {
        const right = lit.has(k.midi) || hit.has(k.midi) || expected.has(k.midi);
        ctx.fillStyle = frame.judged && !right ? theme.wrong : theme.pressed;
        const w = Math.min(k.width * 0.55, 18);
        roundRect(ctx, k.x + (k.width - w) / 2, top + keyHeight - MARKER_SIZE - 8, w, MARKER_SIZE, MARKER_SIZE / 2);
      }
      if (expected.has(k.midi)) {
        ctx.strokeStyle = theme.hand[hand ?? 'right'].active;
        ctx.lineWidth = 3;
        ctx.strokeRect(k.x + 1.5, top + 1.5, k.width - 3, keyHeight - 3);
      }
      if (!k.black) {
        ctx.fillStyle = theme.keyBorder;
        ctx.fillRect(Math.round(k.x), top, 1, height);
        if (k.midi % 12 === 0) this.drawLabel(k, top + height);
      }
    }
  }

  /** Octave name on C keys (C4 = middle C) to help beginners find their place. */
  private drawLabel(k: KeyRect, bottom: number): void {
    const { ctx } = this;
    const size = Math.max(9, Math.min(13, k.width * 0.45));
    ctx.fillStyle = theme.keyLabel;
    ctx.font = `${size}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`C${k.midi / 12 - 1}`, k.x + k.width / 2, bottom - 4);
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  if (w <= 0 || h <= 0) return;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
  ctx.fill();
}
