import { describe, expect, it } from 'vitest'
import { segmentNotes } from './notes'

const HOP = 0.005

type Part = [duration: number, midi: number | null, db: number]

function frames(...parts: Part[]): [number[], (number | null)[], number[]] {
  const midi: (number | null)[] = []
  const level: number[] = []
  for (const [duration, note, db] of parts) {
    for (let k = 0; k < Math.round(duration / HOP); k++) {
      midi.push(note)
      level.push(db)
    }
  }
  return [midi.map((_, i) => i * HOP), midi, level]
}

const midis = (...parts: Part[]) => segmentNotes(...frames(...parts)).map((note) => note.midi)

describe('segmentNotes', () => {
  it('finds two different notes and their times', () => {
    const notes = segmentNotes(
      ...frames([0.5, null, -70], [0.5, 60, -20], [0.5, 62, -20], [0.5, null, -70]),
    )
    expect(notes.map((note) => note.midi)).toEqual([60, 62])
    expect(notes[0].start).toBeCloseTo(0.5, 1)
    expect(notes[1].end).toBeCloseTo(1.5, 1)
  })

  it('splits a repeated note at a dip in level', () => {
    // Same pitch all along, a 12 dB dip in the middle (tonguing).
    expect(
      midis([0.5, null, -70], [0.5, 60, -16], [0.03, 60, -28], [0.5, 60, -16], [0.5, null, -70]),
    ).toEqual([60, 60])
  })

  it('drops a short glitch', () => {
    expect(midis([0.5, null, -70], [0.5, 60, -20], [0.02, 61, -20], [0.5, 62, -20])).toEqual([
      60, 62,
    ])
  })

  it('treats a quiet pitch as silence', () => {
    // A pitch found 40 dB under the playing level (room noise, reverb) is not a note.
    expect(midis([0.5, 60, -20], [0.5, 64, -60], [0.5, null, -70])).toEqual([60])
  })

  it('rounds out-of-tune notes', () => {
    expect(midis([0.5, null, -70], [0.5, 59.7, -20], [0.5, 64.3, -20])).toEqual([60, 64])
  })

  it('returns nothing on an empty take', () => {
    expect(segmentNotes([], [], [])).toEqual([])
  })
})
