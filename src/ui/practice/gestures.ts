/** Movement beyond this many pixels makes a touch a drag, not a tap. */
export const TAP_MAX_DISTANCE = 10;
/** A touch held longer than this many ms is not a tap. */
export const TAP_MAX_MS = 500;

/** Whether a touch that moved (`dx`, `dy`) pixels and lasted `ms` counts as a tap. */
export function isTap(dx: number, dy: number, ms: number): boolean {
  return Math.hypot(dx, dy) < TAP_MAX_DISTANCE && ms <= TAP_MAX_MS;
}
