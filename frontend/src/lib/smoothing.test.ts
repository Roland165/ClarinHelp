import { describe, expect, it } from 'vitest'
import { hzToMidi } from './pitch'
import { PitchSmoother } from './smoothing'

const LOUD = 0.1 // -20 dB
const QUIET = 0.0001 // -80 dB

function cents(a: number, b: number): number {
  return (hzToMidi(a) - hzToMidi(b)) * 100
}

describe('PitchSmoother', () => {
  it('returns null when nothing is played', () => {
    const smoother = new PitchSmoother()
    expect(smoother.push({ frequency: null, rms: QUIET })).toBeNull()
  })

  it('ignores a periodic sound that is too quiet', () => {
    const smoother = new PitchSmoother()
    expect(smoother.push({ frequency: 440, rms: QUIET })).toBeNull()
  })

  it('reduces jitter on a held note', () => {
    const smoother = new PitchSmoother()
    const jitter = [0, 8, -8, 6, -6, 8, -8, 6, -6, 8]
    let out = 0
    for (const c of jitter) out = smoother.push({ frequency: 440 * 2 ** (c / 1200), rms: LOUD })!
    expect(Math.abs(cents(out, 440))).toBeLessThan(4)
  })

  it('ignores a single octave error', () => {
    const smoother = new PitchSmoother()
    for (let i = 0; i < 5; i++) smoother.push({ frequency: 440, rms: LOUD })
    const out = smoother.push({ frequency: 880, rms: LOUD })
    expect(Math.abs(cents(out!, 440))).toBeLessThan(1)
  })

  it('jumps to a new note instead of sliding', () => {
    const smoother = new PitchSmoother()
    for (let i = 0; i < 5; i++) smoother.push({ frequency: 440, rms: LOUD })
    smoother.push({ frequency: 523.25, rms: LOUD })
    const out = smoother.push({ frequency: 523.25, rms: LOUD }) // confirmed by a 2nd frame
    expect(Math.abs(cents(out!, 523.25))).toBeLessThan(1)
  })

  it('holds the note through a short breath, then lets go', () => {
    const smoother = new PitchSmoother()
    for (let i = 0; i < 5; i++) smoother.push({ frequency: 440, rms: LOUD })

    for (let i = 0; i < 5; i++) {
      expect(smoother.push({ frequency: null, rms: QUIET })).not.toBeNull()
    }
    for (let i = 0; i < 20; i++) smoother.push({ frequency: null, rms: QUIET })
    expect(smoother.push({ frequency: null, rms: QUIET })).toBeNull()
  })
})
