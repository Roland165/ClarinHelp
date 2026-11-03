// Cut a pitch track into notes, mirrored from ml/src/clarinhelp/notes.py.

export interface PlayedNote {
  start: number // s
  end: number // s
  midi: number // written pitch
}

// Frames quieter than this under the loudest part of the take are silence.
const GATE_BELOW_PEAK_DB = 30
// Two repeated notes (C C) have the same pitch: only the tonguing separates them,
// and it shows up as a short dip in level (about 12 dB in our recordings).
const DIP_DB = 6
const DIP_WINDOW_S = 0.1
// Shorter than this is a glitch (attack, slide between two notes), not a note.
const MIN_NOTE_S = 0.06

/** One value per frame. writtenMidi is null where no pitch was found. */
export function segmentNotes(
  times: number[],
  writtenMidi: (number | null)[],
  levelDb: number[],
): PlayedNote[] {
  if (times.length < 2) return []
  const hop = times[1] - times[0]
  const gate = percentile(levelDb, 95) - GATE_BELOW_PEAK_DB

  const note = writtenMidi.map((midi, i) =>
    midi !== null && levelDb[i] > gate ? Math.round(midi) : 0,
  )
  for (const i of levelDips(levelDb, Math.round(DIP_WINDOW_S / hop))) note[i] = 0

  const notes: PlayedNote[] = []
  let start = 0
  for (let i = 1; i <= note.length; i++) {
    if (i === note.length || note[i] !== note[start]) {
      if (note[start] !== 0 && (i - start) * hop >= MIN_NOTE_S) {
        notes.push({ start: times[start], end: times[i - 1], midi: note[start] })
      }
      start = i
    }
  }
  return notes
}

/** Frames that are the bottom of a dip of at least DIP_DB on both sides. */
function levelDips(levelDb: number[], window: number): number[] {
  const dips: number[] = []
  for (let i = window; i < levelDb.length - window; i++) {
    const before = levelDb.slice(i - window, i)
    const after = levelDb.slice(i + 1, i + window + 1)
    const level = levelDb[i]
    if (
      level <= Math.min(...before, ...after) &&
      Math.max(...before) - level >= DIP_DB &&
      Math.max(...after) - level >= DIP_DB
    ) {
      dips.push(i)
    }
  }
  return dips
}

/** Same definition as numpy.percentile: linear interpolation between the closest ranks. */
function percentile(values: number[], q: number): number {
  const sorted = [...values].sort((a, b) => a - b)
  const rank = (q / 100) * (sorted.length - 1)
  const low = Math.floor(rank)
  const high = Math.min(low + 1, sorted.length - 1)
  return sorted[low] + (rank - low) * (sorted[high] - sorted[low])
}
