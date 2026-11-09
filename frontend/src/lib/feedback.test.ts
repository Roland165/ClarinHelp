import { describe, expect, it } from 'vitest'
import { compareTake, type ScoreNote } from './feedback'
import type { PlayedNote } from './notes'

function quarters(...midis: number[]): ScoreNote[] {
  return midis.map((midi) => ({ bar: 1, midi, beats: 1 }))
}

/** Played notes from [midi, duration in s], one after the other. */
function played(...notes: [number, number][]): PlayedNote[] {
  let time = 1
  return notes.map(([midi, duration]) => {
    const note = { start: time, end: time + duration, midi }
    time += duration
    return note
  })
}

const kinds = (score: ScoreNote[], take: PlayedNote[]) =>
  compareTake(score, take).mistakes.map((mistake) => mistake.kind)

describe('compareTake', () => {
  it('finds nothing when all is right', () => {
    const score = quarters(60, 62, 64)
    const result = compareTake(score, played([60, 0.5], [62, 0.5], [64, 0.5]))
    expect(result.mistakes).toEqual([])
    expect(result.playedOf).toEqual([0, 1, 2])
  })

  it('finds a wrong note', () => {
    const score = quarters(60, 62, 64)
    const { mistakes } = compareTake(score, played([60, 0.5], [61, 0.5], [64, 0.5]))
    expect(mistakes).toEqual([{ kind: 'wrong', position: 1, midi: 62, played: 1 }])
  })

  it('finds a missed note', () => {
    const score = quarters(60, 62, 64, 65)
    const { mistakes } = compareTake(score, played([60, 0.5], [64, 0.5], [65, 0.5]))
    expect(mistakes).toEqual([{ kind: 'missed', position: 1, midi: 62, played: null }])
  })

  it('finds an extra note', () => {
    const score = quarters(60, 62, 64)
    const { mistakes } = compareTake(score, played([60, 0.5], [62, 0.5], [67, 0.5], [64, 0.5]))
    expect(mistakes).toEqual([{ kind: 'extra', position: 2, midi: 67, played: 2 }])
  })

  it('reads two wrong notes in a row as a shift', () => {
    const take = played([60, 0.5], [61, 0.5], [62, 0.5], [65, 0.5])
    expect(kinds(quarters(60, 62, 64, 65), take)).toEqual(['extra', 'missed'])
  })

  it('does not blame merged repeated notes', () => {
    // C C played legato: one C lasting two beats. Both Cs point to that played note.
    const score = quarters(62, 60, 60, 64, 65)
    const result = compareTake(score, played([62, 0.5], [60, 1], [64, 0.5], [65, 0.5]))
    expect(result.mistakes).toEqual([])
    expect(result.playedOf.slice(1, 3)).toEqual([1, 1])
  })

  it('finds a really skipped repeated note', () => {
    // C C with the second one skipped: one C lasting one beat only.
    const take = played([62, 0.5], [60, 0.5], [64, 0.5], [65, 0.5])
    expect(kinds(quarters(62, 60, 60, 64, 65), take)).toEqual(['missed'])
  })

  it('does not blame a note cut in two', () => {
    // One C cut by a dip: two pieces, but still one beat in total.
    const take = played([62, 0.5], [60, 0.25], [60, 0.25], [64, 0.5], [65, 0.5])
    expect(kinds(quarters(62, 60, 64, 65), take)).toEqual([])
  })

  it('finds a really extra repeated note', () => {
    // A second C of a full beat: the Cs last twice as long as written.
    const take = played([62, 0.5], [60, 0.5], [60, 0.5], [64, 0.5], [65, 0.5])
    expect(kinds(quarters(62, 60, 64, 65), take)).toEqual(['extra'])
  })

  it('does not blame the notes after the player stopped', () => {
    // The tune repeats C D E: playing it once is the start, not the end.
    const take = played([60, 0.5], [62, 0.5], [64, 0.5])
    const result = compareTake(quarters(60, 62, 64, 60, 62, 64), take)
    expect(result.mistakes).toEqual([])
    expect(result.reached).toBe(3)
    expect(result.playedOf).toEqual([0, 1, 2, null, null, null])
  })

  it('reaches nothing when nothing was played', () => {
    const result = compareTake(quarters(60, 62), [])
    expect(result.mistakes).toEqual([])
    expect(result.reached).toBe(0)
  })
})
