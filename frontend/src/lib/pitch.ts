// Pitch helpers shared by the tuner, the transcriber and the score follower.
// Everything internal is in *concert* MIDI numbers (what the microphone hears).
// We only convert to *written* pitch at display time, because that is what a
// Bb clarinettist reads on the sheet.

export const A4_HZ = 440
export const A4_MIDI = 69

// A Bb clarinet sounds a major second (2 semitones) below the written note:
// a written C5 comes out as a concert Bb4.
export const BB_CLARINET_TRANSPOSITION = 2

// Written range of a Bb clarinet: E3 (lowest key) up to about C7.
export const WRITTEN_LOWEST_MIDI = 52 // E3
export const WRITTEN_HIGHEST_MIDI = 96 // C7

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

/** Frequency in Hz -> fractional MIDI number (69.0 = A4, 69.5 = a quarter tone above). */
export function hzToMidi(hz: number, a4 = A4_HZ): number {
  return A4_MIDI + 12 * Math.log2(hz / a4)
}

export function midiToHz(midi: number, a4 = A4_HZ): number {
  return a4 * 2 ** ((midi - A4_MIDI) / 12)
}

export function concertToWritten(concertMidi: number): number {
  return concertMidi + BB_CLARINET_TRANSPOSITION
}

export function writtenToConcert(writtenMidi: number): number {
  return writtenMidi - BB_CLARINET_TRANSPOSITION
}

/** 60 -> "C4" (scientific pitch notation, sharps only for now). */
export function midiToName(midi: number): string {
  const rounded = Math.round(midi)
  const octave = Math.floor(rounded / 12) - 1
  return NOTE_NAMES[((rounded % 12) + 12) % 12] + octave
}

/**
 * Closest equal-tempered note to a frequency, and how far we are from it.
 * cents is in [-50, 50]: negative = flat, positive = sharp.
 */
export function nearestNote(hz: number, a4 = A4_HZ): { midi: number; cents: number } {
  const exact = hzToMidi(hz, a4)
  const midi = Math.round(exact)
  return { midi, cents: (exact - midi) * 100 }
}
