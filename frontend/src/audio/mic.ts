import type { PitchFrame } from './pitch-processor'
import pitchProcessorUrl from './pitch-processor.ts?worker&url'

export type { PitchFrame }

/**
 * Opens the microphone and calls onFrame with the level and the detected pitch
 * ~47 times per second. Returns a function that releases the mic.
 * Must be called from a click: browsers refuse to start audio without a user gesture.
 */
export async function startPitchTracker(onFrame: (frame: PitchFrame) => void): Promise<() => void> {
  const stream = await navigator.mediaDevices.getUserMedia({
    // These are made for voice calls. On an instrument they squash the dynamics
    // and can cut held notes, so we want the raw signal.
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  })

  const context = new AudioContext()
  await context.audioWorklet.addModule(pitchProcessorUrl)

  const source = context.createMediaStreamSource(stream)
  const tracker = new AudioWorkletNode(context, 'pitch-processor')
  tracker.port.onmessage = (event: MessageEvent<PitchFrame>) => onFrame(event.data)

  source.connect(tracker)
  // The processor outputs silence. Connecting it to the speakers anyway makes
  // sure the browser keeps running it.
  tracker.connect(context.destination)

  return () => {
    stream.getTracks().forEach((track) => track.stop())
    void context.close()
  }
}
