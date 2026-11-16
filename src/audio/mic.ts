/** Opens the microphone with browser voice processing disabled, which would distort piano sound. */
export async function openMic(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      channelCount: 1,
    },
  });
}

export interface FrameSource {
  readonly sampleRate: number;
  /** Latest `frameSize` samples from the microphone. */
  read(): Float32Array;
  close(): Promise<void>;
}

/** Exposes the most recent microphone samples for polling from a frame loop. */
export function createFrameSource(stream: MediaStream, frameSize = 8192): FrameSource {
  const ctx = new AudioContext({ latencyHint: 'interactive' });
  const analyser = ctx.createAnalyser();
  analyser.fftSize = frameSize;
  analyser.smoothingTimeConstant = 0;
  ctx.createMediaStreamSource(stream).connect(analyser);
  const frame = new Float32Array(frameSize);
  return {
    sampleRate: ctx.sampleRate,
    read() {
      analyser.getFloatTimeDomainData(frame);
      return frame;
    },
    async close() {
      for (const track of stream.getTracks()) track.stop();
      await ctx.close();
    },
  };
}
