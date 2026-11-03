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

  it('never substitutes with a high substitution cost', () => {
    const pairs = align([60, 62, 64], [60, 65, 64], 3)
    expect(pairs).toContainEqual([1, null])
    expect(pairs).toContainEqual([null, 1])
  })
})
