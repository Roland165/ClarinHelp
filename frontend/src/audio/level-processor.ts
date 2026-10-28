// Runs on the audio thread, not the UI thread. The browser calls process()
// with blocks of 128 samples; we send the loudness (RMS) back to the page
// about 40 times per second, which is plenty for a level meter.

// These globals only exist inside an AudioWorklet, TypeScript doesn't know them.
declare class AudioWorkletProcessor {
  readonly port: MessagePort
}
declare function registerProcessor(name: string, processor: unknown): void

const REPORT_EVERY = 1024 // samples, ~23 ms at 44.1 kHz

class LevelProcessor extends AudioWorkletProcessor {
  private sumOfSquares = 0
  private count = 0

  process(inputs: Float32Array[][]): boolean {
    const samples = inputs[0]?.[0] // first input, first channel (mono is enough)
    if (samples) {
      for (const x of samples) this.sumOfSquares += x * x
      this.count += samples.length

      if (this.count >= REPORT_EVERY) {
        this.port.postMessage(Math.sqrt(this.sumOfSquares / this.count))
        this.sumOfSquares = 0
        this.count = 0
      }
    }
    return true // keep the processor alive
  }
}

registerProcessor('level-processor', LevelProcessor)
