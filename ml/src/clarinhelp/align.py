"""Align two note sequences (edit distance).

Finds the smallest number of changes (substitute, delete, insert) that turns the
expected sequence into the played one, and says which note matches which.
"""

import numpy as np


def align(expected, played, substitution_cost=1):
    """Return a list of (i, j) pairs, in order.

    (i, j): expected[i] matches played[j] (same note or substitution)
    (i, None): expected[i] was not played
    (None, j): played[j] is an extra note

    With substitution_cost > 2, a substitution always costs more than deleting one
    note and inserting another, so only equal notes are ever matched.
    """
    n, m = len(expected), len(played)

    def match_cost(i, j):
        return 0 if expected[i] == played[j] else substitution_cost

    # cost[i, j] = changes needed to turn expected[:i] into played[:j]
    cost = np.zeros((n + 1, m + 1), dtype=int)
    cost[:, 0] = np.arange(n + 1)
    cost[0, :] = np.arange(m + 1)
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            cost[i, j] = min(
                cost[i - 1, j - 1] + match_cost(i - 1, j - 1),
                cost[i - 1, j] + 1,
                cost[i, j - 1] + 1,
            )

    # Walk back from the end to recover which choice was made at each step.
    pairs = []
    i, j = n, m
    while i > 0 or j > 0:
        if i > 0 and j > 0 and cost[i, j] == cost[i - 1, j - 1] + match_cost(i - 1, j - 1):
            pairs.append((i - 1, j - 1))
            i, j = i - 1, j - 1
        elif i > 0 and cost[i, j] == cost[i - 1, j] + 1:
            pairs.append((i - 1, None))
            i -= 1
        else:
            pairs.append((None, j - 1))
            j -= 1
    return pairs[::-1]
