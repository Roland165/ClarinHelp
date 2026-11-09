import { describe, expect, it } from 'vitest'
import { align } from './align'

describe('align', () => {
  it('matches identical sequences', () => {
    expect(align([60, 62, 64], [60, 62, 64])).toEqual([
      [0, 0],
      [1, 1],
      [2, 2],
    ])
  })

  it('keeps a wrong note in place', () => {
    expect(align([60, 62, 64], [60, 65, 64])).toEqual([
      [0, 0],
      [1, 1],
      [2, 2],
    ])
  })

  it('finds a missing note', () => {
    expect(align([60, 62, 64, 65], [60, 64, 65])).toEqual([
      [0, 0],
      [1, null],
      [2, 1],
      [3, 2],
    ])
  })

  it('finds an extra note', () => {
    expect(align([60, 62, 64], [60, 62, 67, 64])).toEqual([
      [0, 0],
      [1, 1],
      [null, 2],
      [2, 3],
    ])
  })

  it('handles empty sequences', () => {
    expect(align([60, 62], [])).toEqual([
      [0, null],
      [1, null],
    ])
    expect(align([], [60, 62])).toEqual([
      [null, 0],
      [null, 1],
    ])
  })

  it('keeps the start of a repeated tune with freeEnd', () => {
    const tune = [60, 62, 64, 60, 62, 64]
    expect(align(tune, [60, 62, 64], 1, true)).toEqual([
      [0, 0],
      [1, 1],
      [2, 2],
    ])
  })

  it('still finds a missing note with freeEnd', () => {
    expect(align([60, 62, 64, 65, 67], [60, 64, 65], 1, true)).toEqual([
      [0, 0],
      [1, null],
      [2, 1],
      [3, 2],
    ])
  })

  it('goes as far as possible on equal costs with freeEnd', () => {
    // "missed D then C" and "extra C then stop" cost the same: the first one wins.
    const pairs = align([64, 62, 62, 60], [64, 62, 60], 1, true)
    expect(pairs).toContainEqual([3, 2])
    expect(pairs.filter(([, j]) => j === null)).toHaveLength(1)
  })

  it('never substitutes with a high substitution cost', () => {
    const pairs = align([60, 62, 64], [60, 65, 64], 3)
    expect(pairs).toContainEqual([1, null])
    expect(pairs).toContainEqual([null, 1])
  })
})
