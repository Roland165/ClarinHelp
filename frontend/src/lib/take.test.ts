import { describe, expect, it } from 'vitest'
import type { PitchFrame } from '../audio/mic'
import type { ScoreNote } from './feedback'
import { midiToHz, writtenToConcert } from './pitch'
import { analyzeTake } from './take'

const HOP = 0.02

/** Frames of a take, from [written midi or null for silence, cents off, duration in s]. */
function take(...parts: [number | null, number, number][]): PitchFrame[] {
  const frames: PitchFrame[] = []
  for (const [midi, cents, duration] of parts) {
    for (let k = 0; k < Math.round(duration / HOP); k++) {
      frames.push({
        time: frames.length * HOP,
        rms: midi === null ? 0.0003 : 0.1,
        frequency: midi === null ? null : midiToHz(writtenToConcert(midi) + cents / 100),
        confidence: midi === null ? 0 : 1,
      })
    }
  }
  return frames
}

const score: ScoreNote[] = [60, 62, 64, 65].map((midi, i) => ({ bar: i + 1, midi, beats: 1 }))
const SILENCE: [null, number, number] = [null, 0, 0.5]

describe('analyzeTake', () => {
  it('marks notes in tune and a bit off', () => {
    const result = analyzeTake(
      take(SILENCE, [60, 0, 0.5], [62, 10, 0.5], [64, -40, 0.5], [65, 30, 0.5], SILENCE),
      score,
    )
    expect(result.statuses).toEqual(['in-tune', 'in-tune', 'close', 'close'])
    expect(result.messages).toEqual([])
  })

  it('reports a wrong note in words', () => {
    const result = analyzeTake(
      take(SILENCE, [60, 0, 0.5], [61, 0, 0.5], [64, 0, 0.5], [65, 0, 0.5], SILENCE),
      score,
    )
    expect(result.statuses).toEqual(['in-tune', 'wrong', 'in-tune', 'in-tune'])
    expect(result.messages).toEqual(['Bar 2: C#4 instead of D4'])
    expect(result.counts.wrong).toBe(1)
  })

  it('reports a missed note', () => {
    const result = analyzeTake(
      take(SILENCE, [60, 0, 0.5], [null, 0, 0.5], [64, 0, 0.5], [65, 0, 0.5], SILENCE),
      score,
    )
    expect(result.statuses[1]).toBe('missed')
    expect(result.messages).toEqual(['Bar 2: missed D4'])
  })

  it('reports an extra note', () => {
    const result = analyzeTake(
      take(SILENCE, [60, 0, 0.5], [62, 0, 0.5], [67, 0, 0.5], [64, 0, 0.5], [65, 0, 0.5], SILENCE),
      score,
    )
    expect(result.statuses).toEqual(['in-tune', 'in-tune', 'in-tune', 'in-tune'])
    expect(result.messages).toEqual(['Bar 3: extra G4'])
    expect(result.counts.extra).toBe(1)
  })

  it('marks everything as missed when nothing was played', () => {
    expect(analyzeTake([], score).statuses).toEqual(['missed', 'missed', 'missed', 'missed'])
  })
})
