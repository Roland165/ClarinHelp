// Compare what was played with the score, note by note.
// Mirrored from ml/src/clarinhelp/feedback.py, which measures how well this works.

import { align, type AlignedPair } from './align'
import type { PlayedNote } from './notes'

export interface ScoreNote {
  bar: number // from 1
  midi: number // written pitch
  beats: number // duration in quarter notes
}

export interface Mistake {
  kind: 'wrong' | 'missed' | 'extra'
  position: number // index in the score (for "extra": the score note that comes next)
  midi: number // the note in the score, or the extra note played
  played: number | null // index of the played note, for "wrong" and "extra"
}

export interface Comparison {
  mistakes: Mistake[]
  // How many score notes the take went through. The player may stop before the end:
  // the notes after that are not mistakes, they were just not played.
  reached: number
  // For each score note, the played note that covers it, or null if there is none.
  // Repeated notes merged into one long note all point to that note.
  playedOf: (number | null)[]
}

// Cheaper than a missed + an extra note (2), so that one wrong note stays a wrong note.
// But two wrong notes in a row (3) become a missed + an extra note: usually a shift.
const SUBSTITUTION_COST = 1.5

function mistakesFromPairs(pairs: AlignedPair[], scoreMidi: number[], playedMidi: number[]) {
  const mistakes: Mistake[] = []
  let position = 0
  for (const [i, j] of pairs) {
    if (i === null) {
      mistakes.push({ kind: 'extra', position, midi: playedMidi[j!], played: j })
      continue
    }
    position = i + 1
    if (j === null) {
      mistakes.push({ kind: 'missed', position: i, midi: scoreMidi[i], played: null })
    } else if (scoreMidi[i] !== playedMidi[j]) {
      mistakes.push({ kind: 'wrong', position: i, midi: scoreMidi[i], played: j })
    }
  }
  return mistakes
}

/** Groups of consecutive score notes with the same pitch: [60, 60, 62] -> [[0, 1], [2]]. */
function runsOf(values: number[]): number[][] {
  const groups: number[][] = []
  values.forEach((value, index) => {
    const last = groups[groups.length - 1]
    if (last && values[last[0]] === value) last.push(index)
    else groups.push([index])
  })
  return groups
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

/**
 * Repeated notes are the hard case, because only a small dip in level separates them.
 * Two of them played legato come out as one long note (it looks like a missed note),
 * and one long note cut by a dip comes out as two (it looks like an extra note).
 * The total duration tells them apart: a really skipped note leaves a silence, and a
 * really extra note makes the whole thing longer.
 */
export function compareTake(score: ScoreNote[], played: PlayedNote[]): Comparison {
  const scoreMidi = score.map((note) => note.midi)
  const playedMidi = played.map((note) => note.midi)
  const pairs = align(scoreMidi, playedMidi, SUBSTITUTION_COST, true)
  const mistakes = mistakesFromPairs(pairs, scoreMidi, playedMidi)
  const reached = Math.max(0, ...pairs.map(([i]) => (i === null ? 0 : i + 1)))

  const duration = (j: number) => played[j].end - played[j].start
  const matched = new Map<number, number>()
  for (const [i, j] of pairs) if (i !== null && j !== null) matched.set(i, j)

  const playedOf: (number | null)[] = score.map((_, i) => matched.get(i) ?? null)
  const playedRight = [...matched]
    .filter(([i, j]) => scoreMidi[i] === playedMidi[j])
    .map(([i, j]) => duration(j) / score[i].beats)
  // No right note at all: no tempo to judge the durations with.
  if (playedRight.length === 0) return { mistakes, reached, playedOf }
  const secondsPerBeat = median(playedRight)

  const runs = runsOf(scoreMidi)
  const runOf = new Map<number, number[]>()
  for (const run of runs) for (const i of run) runOf.set(i, run)

  // Same pitch as a neighbouring score note: the played note belongs to that run.
  const extrasOfRun = new Map<number, number[]>()
  mistakes.forEach((mistake, index) => {
    if (mistake.kind !== 'extra') return
    for (const i of [mistake.position - 1, mistake.position]) {
      const run = runOf.get(i)
      if (run && scoreMidi[i] === mistake.midi) {
        extrasOfRun.set(run[0], [...(extrasOfRun.get(run[0]) ?? []), index])
        break
      }
    }
  })

  const ignored = new Set<number>()
  for (const run of runs) {
    const missed: number[] = []
    mistakes.forEach((mistake, index) => {
      if (mistake.kind === 'missed' && run.includes(mistake.position)) missed.push(index)
    })
    const extras = extrasOfRun.get(run[0]) ?? []
    if (missed.length === 0 && extras.length === 0) continue

    let heard = 0
    for (const i of run) if (matched.has(i)) heard += duration(matched.get(i)!)
    for (const index of extras) heard += duration(mistakes[index].played!)
    // Positive: part of the run was not heard. Negative: more was heard than written.
    let balance = run.reduce((sum, i) => sum + score[i].beats, 0) - heard / secondsPerBeat

    for (const index of missed) {
      const beats = score[mistakes[index].position].beats
      if (balance >= beats / 2) {
        balance -= beats // really skipped
      } else {
        ignored.add(index) // merged with its neighbour
        playedOf[mistakes[index].position] = nearestPlayed(run, mistakes[index].position, matched)
      }
    }
    for (const index of extras) {
      const beats = duration(mistakes[index].played!) / secondsPerBeat
      if (-balance >= beats / 2) balance += beats // really extra
      else ignored.add(index) // one note cut in two
    }
  }

  return { mistakes: mistakes.filter((_, index) => !ignored.has(index)), reached, playedOf }
}

/** The played note of the closest repeated note that has one. */
function nearestPlayed(run: number[], position: number, matched: Map<number, number>) {
  const withNote = run.filter((i) => matched.has(i))
  if (withNote.length === 0) return null
  const closest = withNote.reduce((best, i) =>
    Math.abs(i - position) < Math.abs(best - position) ? i : best,
  )
  return matched.get(closest)!
}
