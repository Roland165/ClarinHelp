import { describe, expect, it } from 'vitest'
import {
  concertToWritten,
  hzToMidi,
  midiToHz,
  midiToName,
  nearestNote,
  writtenToConcert,
  WRITTEN_LOWEST_MIDI,
} from './pitch'

describe('frequency <-> MIDI', () => {
  it('maps A4 to 440 Hz and back', () => {
    expect(hzToMidi(440)).toBeCloseTo(69)
    expect(midiToHz(69)).toBeCloseTo(440)
  })

  it('one octave up doubles the frequency', () => {
    expect(midiToHz(81)).toBeCloseTo(880)
  })

  it('supports a different reference pitch (A4 = 442 Hz)', () => {
    expect(hzToMidi(442, 442)).toBeCloseTo(69)
  })
})

describe('Bb clarinet transposition', () => {
  it('a written C5 sounds as a concert Bb4', () => {
    expect(writtenToConcert(72)).toBe(70)
    expect(midiToName(writtenToConcert(72))).toBe('A#4')
  })

  it('a concert A4 (440 Hz) is read as a written B4', () => {
    const { midi } = nearestNote(440)
    expect(midiToName(concertToWritten(midi))).toBe('B4')
  })

  it('the lowest written E3 sounds as D3 (~146.8 Hz)', () => {
    expect(midiToName(WRITTEN_LOWEST_MIDI)).toBe('E3')
    expect(midiToHz(writtenToConcert(WRITTEN_LOWEST_MIDI))).toBeCloseTo(146.83, 1)
  })

  it('round-trips', () => {
    for (let m = 40; m < 100; m++) expect(concertToWritten(writtenToConcert(m))).toBe(m)
  })
})

describe('nearestNote', () => {
  it('reports a sharp note with positive cents', () => {
    const hz = midiToHz(69.1) // A4 + 10 cents
    const { midi, cents } = nearestNote(hz)
    expect(midi).toBe(69)
    expect(cents).toBeCloseTo(10)
  })

  it('reports a flat note with negative cents', () => {
    const { midi, cents } = nearestNote(midiToHz(59.8)) // C4 - 20 cents
    expect(midi).toBe(60)
    expect(cents).toBeCloseTo(-20)
  })
})

describe('midiToName', () => {
  it('uses scientific pitch notation', () => {
    expect(midiToName(60)).toBe('C4')
    expect(midiToName(61)).toBe('C#4')
    expect(midiToName(96)).toBe('C7')
  })
})
