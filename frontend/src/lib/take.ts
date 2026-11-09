// From the frames of a recorded take to the feedback on every note of the score.

import type { PitchFrame } from '../audio/mic'
import { compareTake, type ScoreNote } from './feedback'
import { toDb } from './level'
import { segmentNotes, type PlayedNote } from './notes'
import { concertToWritten, hzToMidi, midiToName } from './pitch'

export type NoteStatus = 'in-tune' | 'close' | 'wrong' | 'missed'

export interface TakeResult {
  statuses: (NoteStatus | null)[] // one per score note, null = not played (stopped before)
  messages: string[] // the mistakes, in words
  counts: Record<NoteStatus | 'extra', number>
  stoppedAtBar: number | null // null if the take went to the end of the tune
}

// Wider than the tuner (5 cents): this judges a whole note played by a beginner,
// not the fine adjustment of a held note. 25 cents starts to sound clearly off.
const IN_TUNE_CENTS = 25

export function analyzeTake(frames: PitchFrame[], score: ScoreNote[]): TakeResult {
  const times = frames.map((frame) => frame.time)
  const written = frames.map((frame) =>
    frame.frequency === null ? null : concertToWritten(hzToMidi(frame.frequency)),
  )
  const played = segmentNotes(times, written, frames.map((frame) => toDb(frame.rms)))
  const { mistakes, reached, playedOf } = compareTake(score, played)

  const statuses = score.map((note, i): NoteStatus | null => {
    if (i >= reached) return null
    const j = playedOf[i]
    if (j === null) return 'missed'
    const cents = medianCents(played[j], note.midi, times, written)
    return cents !== null && Math.abs(cents) > IN_TUNE_CENTS ? 'close' : 'in-tune'
  })
  for (const { kind, position } of mistakes) {
    if (kind === 'wrong' || kind === 'missed') statuses[position] = kind
  }

  const messages = mistakes.map(({ kind, position, midi, played: j }) => {
    // An extra note after the last one still belongs to the last bar.
    const bar = score[Math.min(position, score.length - 1)]?.bar
    if (kind === 'wrong') {
      return `Bar ${bar}: ${midiToName(played[j!].midi)} instead of ${midiToName(midi)}`
    }
    return `Bar ${bar}: ${kind} ${midiToName(midi)}`
  })

  const counts = { 'in-tune': 0, close: 0, wrong: 0, missed: 0, extra: 0 }
  for (const status of statuses) if (status) counts[status]++
  counts.extra = mistakes.filter((mistake) => mistake.kind === 'extra').length
  const stoppedAtBar = reached < score.length && reached > 0 ? score[reached - 1].bar : null
  return { statuses, messages, counts, stoppedAtBar }
}

/** How far a played note is from the score note, over its middle half (no attack, no release). */
function medianCents(
  note: PlayedNote,
  midi: number,
  times: number[],
  written: (number | null)[],
): number | null {
  const quarter = (note.end - note.start) / 4
  const deviations: number[] = []
  times.forEach((time, i) => {
    const value = written[i]
    if (value !== null && time >= note.start + quarter && time <= note.end - quarter) {
      deviations.push((value - midi) * 100)
    }
  })
  if (deviations.length === 0) return null
  deviations.sort((a, b) => a - b)
  return deviations[Math.floor(deviations.length / 2)]
}
