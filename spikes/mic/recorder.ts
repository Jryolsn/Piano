// Captures raw mic samples via an AudioWorklet, bypassing lossy MediaRecorder codecs.
const WORKLET = `
registerProcessor('capture', class extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) this.port.postMessage(ch.slice());
    return true;
  }
});`;

export class Recorder {
  private chunks: Float32Array[] = [];
  private recording = false;

  private constructor(private node: AudioWorkletNode) {
    node.port.onmessage = (e: MessageEvent<Float32Array>) => {
      if (this.recording) this.chunks.push(e.data);
    };
  }

  static async create(ctx: AudioContext, source: AudioNode): Promise<Recorder> {
    const url = URL.createObjectURL(new Blob([WORKLET], { type: 'text/javascript' }));
    await ctx.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);
    const node = new AudioWorkletNode(ctx, 'capture');
    source.connect(node);
    return new Recorder(node);
  }

  start(): void {
    this.chunks = [];
    this.recording = true;
  }

  stop(): Float32Array {
    this.recording = false;
    const out = new Float32Array(this.chunks.reduce((n, c) => n + c.length, 0));
    let offset = 0;
    for (const c of this.chunks) {
      out.set(c, offset);
      offset += c.length;
    }
    this.chunks = [];
    return out;
  }

  get isRecording(): boolean {
    return this.recording;
  }

  dispose(): void {
    this.node.disconnect();
  }
}
