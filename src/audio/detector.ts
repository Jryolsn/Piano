/** Result of checking whether the expected notes are sounding right now. */
export interface DetectionResult {
  match: boolean;
  /** 0..1 */
  confidence: number;
}

/** Verifies expected notes against an audio frame. Implementations are swappable for comparison. */
export interface Detector {
  detect(frame: Float32Array, sampleRate: number, expectedMidi: readonly number[]): DetectionResult;
  reset(): void;
}
