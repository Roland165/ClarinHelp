import { describe, expect, it } from 'vitest'
import { LevelGate, toDb } from './level'

const FRAMES_PER_SECOND = 47

describe('toDb', () => {
  it('full scale is 0 dB, a tenth is -20 dB', () => {
    expect(toDb(1)).toBeCloseTo(0)
    expect(toDb(0.1)).toBeCloseTo(-20)
  })
})

describe('LevelGate', () => {
  it('starts at -15 dB', () => {
    expect(new LevelGate().gateDb).toBe(-15)
  })

  it('settles 20 dB under the playing level', () => {
    const gate = new LevelGate()
    for (let i = 0; i < FRAMES_PER_SECOND; i++) gate.update(-15, true)
    expect(gate.gateDb).toBeCloseTo(-35)
  })

  it('a piano note still passes right after a forte', () => {
    const gate = new LevelGate()
    for (let i = 0; i < 2 * FRAMES_PER_SECOND; i++) gate.update(-15, true) // forte
    gate.update(-30, true) // first frame of a piano note
    expect(-30).toBeGreaterThan(gate.gateDb)
  })

  it('does not move during silence', () => {
    const gate = new LevelGate()
    for (let i = 0; i < FRAMES_PER_SECOND; i++) gate.update(-20, true)
    const before = gate.gateDb
    for (let i = 0; i < 5 * FRAMES_PER_SECOND; i++) gate.update(-70, false)
    expect(gate.gateDb).toBe(before)
  })

  it('never drops below -55 dB', () => {
    const gate = new LevelGate()
    gate.update(-80, true)
    expect(gate.gateDb).toBe(-55)
  })
})
