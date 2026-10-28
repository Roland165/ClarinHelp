import levelProcessorUrl from './level-processor.ts?worker&url'

/**
 * Opens the microphone and calls onLevel with the RMS level (0..1) ~40 times per second.
 * Returns a function that releases the mic.
 * Must be called from a click: browsers refuse to start audio without a user gesture.
 */
export async function startLevelMeter(onLevel: (rms: number) => void): Promise<() => void> {
  const stream = await navigator.mediaDevices.getUserMedia({
    // These are made for voice calls. On an instrument they squash the dynamics
    // and can cut held notes, so we want the raw signal.
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  })

  const context = new AudioContext()
  await context.audioWorklet.addModule(levelProcessorUrl)

  const source = context.createMediaStreamSource(stream)
  const meter = new AudioWorkletNode(context, 'level-processor')
  meter.port.onmessage = (event: MessageEvent<number>) => onLevel(event.data)

  source.connect(meter)
  // The processor outputs silence. Connecting it to the speakers anyway makes
  // sure the browser keeps running it.
  meter.connect(context.destination)

  return () => {
    stream.getTracks().forEach((track) => track.stop())
    void context.close()
  }
}
