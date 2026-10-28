// YIN pitch detector (de Cheveigné & Kawahara, 2002).
//
// Idea: a periodic signal looks like itself when shifted by one period.
// For every candidate shift (lag) tau we measure how different the signal is
// from its shifted copy, and pick the first lag where it is "almost the same".
// Frequency = sampleRate / tau.

export interface PitchEstimate {
  frequency: number // Hz
  confidence: number // 0..1, how periodic the frame is
}

export interface YinOptions {
  sampleRate: number
  // Search range. The defaults cover a Bb clarinet (concert D3 ≈ 147 Hz to Bb6 ≈ 1865 Hz)
  // with some margin.
  minFrequency?: number
  maxFrequency?: number
  // Lower = stricter. 0.1 to 0.15 is the usual range from the paper.
  threshold?: number
}

export function yin(frame: Float32Array, options: YinOptions): PitchEstimate | null {
  const { sampleRate, minFrequency = 120, maxFrequency = 2200, threshold = 0.15 } = options

  const tauMin = Math.max(2, Math.floor(sampleRate / maxFrequency))
  const tauMax = Math.min(Math.floor(frame.length / 2), Math.ceil(sampleRate / minFrequency))
  const windowSize = frame.length - tauMax

  // Step 1: difference function d(tau) = sum (x[j] - x[j + tau])^2
  const diff = new Float32Array(tauMax + 1)
  for (let tau = 1; tau <= tauMax; tau++) {
    let sum = 0
    for (let j = 0; j < windowSize; j++) {
      const delta = frame[j] - frame[j + tau]
      sum += delta * delta
    }
    diff[tau] = sum
  }

  // Step 2: cumulative mean normalization. Dividing by the average of the previous
  // values removes the trivial minimum at tau = 0 and makes one threshold work
  // whatever the volume.
  const cmnd = new Float32Array(tauMax + 1)
  cmnd[0] = 1
  let runningSum = 0
  for (let tau = 1; tau <= tauMax; tau++) {
    runningSum += diff[tau]
    cmnd[tau] = runningSum === 0 ? 1 : (diff[tau] * tau) / runningSum
  }

  // Step 3: take the FIRST dip under the threshold, not the global minimum.
  // The global minimum is often at 2x or 3x the period (an octave error).
  let tau = tauMin
  while (tau <= tauMax && cmnd[tau] >= threshold) tau++
  if (tau > tauMax) return null // nothing periodic enough: silence, noise, breath

  // ...then slide down to the bottom of that dip.
  while (tau < tauMax && cmnd[tau + 1] < cmnd[tau]) tau++

  // Step 4: the true period falls between two samples, refine it.
  const period = parabolicMinimum(cmnd, tau)

  return { frequency: sampleRate / period, confidence: 1 - cmnd[tau] }
}

// Fit a parabola through (i-1, i, i+1) and return the x of its lowest point.
function parabolicMinimum(values: Float32Array, i: number): number {
  if (i <= 0 || i >= values.length - 1) return i
  const left = values[i - 1]
  const middle = values[i]
  const right = values[i + 1]
  const curvature = left - 2 * middle + right
  return curvature === 0 ? i : i + (left - right) / (2 * curvature)
}
