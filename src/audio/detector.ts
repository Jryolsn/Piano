/** Result of checking whether the expected notes are sounding right now. */
export interface DetectionResult {
  match: boolean;
  /** 0..1 */
  confidence: number;
  /** Expected notes that sound in this frame, even if the others don't. */
  present?: readonly number[];
  /** Candidate notes that sounded in this frame, whether expected or not. */
  heard?: readonly number[];
}

/** Verifies expected notes against an audio frame. Implementations are swappable for comparison. */
export interface Detector {
  detect(frame: Float32Array, sampleRate: number, expectedMidi: readonly number[],
    candidates?: readonly number[],
  ): DetectionResult;
  reset(): void;
}
