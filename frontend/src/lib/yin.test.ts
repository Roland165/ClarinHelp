import { describe, expect, it } from 'vitest'
import { hzToMidi } from './pitch'
import { yin } from './yin'

const FRAME = 2048

// Sum of sines: harmonics[k] is the amplitude of harmonic k+1.
function tone(frequency: number, sampleRate: number, harmonics = [1]): Float32Array {
  const frame = new Float32Array(FRAME)
  for (let i = 0; i < FRAME; i++) {
    harmonics.forEach((amp, k) => {
      frame[i] += amp * Math.sin((2 * Math.PI * (k + 1) * frequency * i) / sampleRate)
    })
  }
  return frame
}

function centsBetween(a: number, b: number): number {
  return Math.abs(hzToMidi(a) - hzToMidi(b)) * 100
}

describe('yin', () => {
  it.each([
    [146.83, 44100], // lowest clarinet note (written E3)
    [440, 44100],
    [440, 48000],
    [1046.5, 48000],
    [1864.66, 48000], // around the top of the range
  ])('finds a pure %f Hz tone at %i Hz sample rate', (frequency, sampleRate) => {
    const result = yin(tone(frequency, sampleRate), { sampleRate })
    expect(result).not.toBeNull()
    expect(centsBetween(result!.frequency, frequency)).toBeLessThan(2)
  })

  it('finds the fundamental of a clarinet-like tone (odd harmonics only)', () => {
    // Low clarinet notes have strong odd harmonics and almost no even ones.
    const frequency = 196
    const result = yin(tone(frequency, 48000, [1, 0, 0.6, 0, 0.4, 0, 0.2]), { sampleRate: 48000 })
    expect(centsBetween(result!.frequency, frequency)).toBeLessThan(2)
  })

  it('returns null on silence', () => {
    expect(yin(new Float32Array(FRAME), { sampleRate: 48000 })).toBeNull()
  })

  it('returns null on white noise', () => {
    // Small deterministic random generator so the test never flakes.
    let seed = 42
    const random = () => ((seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32) * 2 - 1
    const noise = Float32Array.from({ length: FRAME }, random)
    expect(yin(noise, { sampleRate: 48000 })).toBeNull()
  })

  it('is confident on a clean tone', () => {
    expect(yin(tone(440, 48000), { sampleRate: 48000 })!.confidence).toBeGreaterThan(0.9)
  })
})
