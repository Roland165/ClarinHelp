import { toDb } from './level'
import { hzToMidi, midiToHz } from './pitch'

// Below this level we consider the player is not playing (room noise, breath).
// To be checked against real recordings with the USB mic.
export const SILENCE_DB = -50

// Median over the last 3 frames (~65 ms): a single wrong frame (octave jump,
// attack noise) is outvoted by its two neighbours.
const MEDIAN_SIZE = 3
// Exponential smoothing for the needle: 0 = frozen, 1 = no smoothing.
const ALPHA = 0.25
// Keep showing the last note through short gaps (~250 ms), e.g. a quick breath.
const HOLD_FRAMES = 12

interface Frame {
  frequency: number | null
  rms: number
}

/**
 * Turns the raw ~47 frames/s from the pitch detector into a stable value for display.
 * Works in MIDI (semitones) because smoothing must be in a log scale:
 * averaging Hz would bias high notes.
 */
export class PitchSmoother {
  private recent: number[] = []
  private smoothedMidi: number | null = null
  private silentFrames = 0

  push({ frequency, rms }: Frame): number | null {
    const playing = frequency !== null && toDb(rms) > SILENCE_DB

    if (!playing) {
      this.silentFrames++
      if (this.silentFrames > HOLD_FRAMES) this.reset()
      return this.current()
    }
    this.silentFrames = 0

    this.recent.push(hzToMidi(frequency))
    if (this.recent.length > MEDIAN_SIZE) this.recent.shift()
    const target = median(this.recent)

    // A new note (more than half a semitone away): jump to it instead of
    // sliding the needle across the whole scale.
    if (this.smoothedMidi === null || Math.abs(target - this.smoothedMidi) > 0.5) {
      this.smoothedMidi = target
    } else {
      this.smoothedMidi += ALPHA * (target - this.smoothedMidi)
    }
    return this.current()
  }

  reset() {
    this.recent = []
    this.smoothedMidi = null
  }

  private current(): number | null {
    return this.smoothedMidi === null ? null : midiToHz(this.smoothedMidi)
  }
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}
