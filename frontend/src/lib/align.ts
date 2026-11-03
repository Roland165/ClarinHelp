// Align two note sequences (edit distance), mirrored from ml/src/clarinhelp/align.py.
//
// Finds the smallest number of changes (substitute, delete, insert) that turns the
// expected sequence into the played one, and says which note matches which.

// [i, j]: expected[i] matches played[j] (same note or substitution)
// [i, null]: expected[i] was not played
// [null, j]: played[j] is an extra note
export type AlignedPair = [number | null, number | null]

export function align(expected: number[], played: number[], substitutionCost = 1): AlignedPair[] {
  const n = expected.length
  const m = played.length
  const matchCost = (i: number, j: number) => (expected[i] === played[j] ? 0 : substitutionCost)

  // cost[i][j] = changes needed to turn expected[:i] into played[:j]
  const cost = Array.from({ length: n + 1 }, () => new Float64Array(m + 1))
  for (let i = 0; i <= n; i++) cost[i][0] = i
  for (let j = 0; j <= m; j++) cost[0][j] = j
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      cost[i][j] = Math.min(
        cost[i - 1][j - 1] + matchCost(i - 1, j - 1),
        cost[i - 1][j] + 1,
        cost[i][j - 1] + 1,
      )
    }
  }

  // Walk back from the end to recover which choice was made at each step.
  const pairs: AlignedPair[] = []
  let i = n
  let j = m
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && cost[i][j] === cost[i - 1][j - 1] + matchCost(i - 1, j - 1)) {
      pairs.push([i - 1, j - 1])
      i--
      j--
    } else if (i > 0 && cost[i][j] === cost[i - 1][j] + 1) {
      pairs.push([i - 1, null])
      i--
    } else {
      pairs.push([null, j - 1])
      j--
    }
  }
  return pairs.reverse()
}
