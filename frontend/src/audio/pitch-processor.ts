// Runs on the audio thread, not the UI thread. The browser calls process()
// with blocks of 128 samples. We keep the last FRAME_SIZE samples in a buffer
// and run YIN on it every HOP_SIZE samples.

import { yin } from '../lib/yin'

// These globals only exist inside an AudioWorklet, TypeScript doesn't know them.
declare class AudioWorkletProcessor {
  readonly port: MessagePort
}
declare function registerProcessor(name: string, processor: unknown): void
declare const sampleRate: number

export interface PitchFrame {
  rms: number
  frequency: number | null // null = nothing periodic (silence, breath, noise)
  confidence: number
}

// 2048 samples = ~43 ms at 48 kHz: several periods even for the lowest note (D3, ~6.8 ms),
// while keeping the delay low.
const FRAME_SIZE = 2048
// One analysis every ~21 ms. Smaller would be smoother but costs more CPU on the audio thread.
const HOP_SIZE = 1024

class PitchProcessor extends AudioWorkletProcessor {
  private buffer = new Float32Array(FRAME_SIZE)
  private sinceLastAnalysis = 0

  process(inputs: Float32Array[][]): boolean {
    const samples = inputs[0]?.[0] // first input, first channel (mono is enough)
    if (!samples) return true

    // Slide the window: drop the oldest samples, append the new block at the end.
    this.buffer.copyWithin(0, samples.length)
    this.buffer.set(samples, FRAME_SIZE - samples.length)

    this.sinceLastAnalysis += samples.length
    if (this.sinceLastAnalysis >= HOP_SIZE) {
      this.sinceLastAnalysis = 0
      this.port.postMessage(this.analyze())
    }
    return true // keep the processor alive
  }

  private analyze(): PitchFrame {
    let sumOfSquares = 0
    for (const x of this.buffer) sumOfSquares += x * x

    const pitch = yin(this.buffer, { sampleRate })
    return {
      rms: Math.sqrt(sumOfSquares / FRAME_SIZE),
      frequency: pitch?.frequency ?? null,
      confidence: pitch?.confidence ?? 0,
    }
  }
}

registerProcessor('pitch-processor', PitchProcessor)
