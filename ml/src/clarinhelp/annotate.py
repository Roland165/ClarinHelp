"""Place the notes of the score on a recording (forced alignment).

We know WHAT was played: the score (the errors and transposed takes have their
own). We only need WHEN. The pitch track gives sounding segments; they are
matched to the score, and the labels keep the timings of the segments and the
note names of the score.

The hard case is repeated notes (C C C): played legato they come out as one long
segment, which is split where the level is lowest, near the place the score
durations predict.
"""

import numpy as np

from clarinhelp.align import align

# The split between two repeated notes is searched this far around the place
# predicted by the score durations.
SPLIT_SEARCH_S = 0.15


def runs(values):
    """Group consecutive equal values: [60, 60, 62] -> [(60, [0, 1]), (62, [2])]."""
    groups = []
    for index, value in enumerate(values):
        if groups and groups[-1][0] == value:
            groups[-1][1].append(index)
        else:
            groups.append((value, [index]))
    return groups


def fit_score(score, segments, times, level_db):
    """Match score notes to the segments of segment_notes().

    Returns (notes, missing, extra):
      notes: (start s, end s, written MIDI) for every score note that was found
      missing: indices of the score notes that no segment matched
      extra: segments that match no score note (noise, slides)
    """
    score_runs = runs([note.midi for note in score])
    segment_runs = runs([midi for _, _, midi in segments])
    # Runs are matched by pitch only (never a C on a D): we trust the score.
    pairs = align(
        [midi for midi, _ in score_runs], [midi for midi, _ in segment_runs], substitution_cost=3
    )

    notes, missing, extra = [], [], []
    for a, b in pairs:
        if b is None:
            missing += score_runs[a][1]
        elif a is None:
            extra += [segments[k] for k in segment_runs[b][1]]
        else:
            run_notes = [score[k] for k in score_runs[a][1]]
            run_segments = [segments[k] for k in segment_runs[b][1]]
            notes += place_run(run_notes, run_segments, times, level_db)
    return notes, missing, extra


def place_run(notes, segments, times, level_db):
    """Same-pitch score notes on same-pitch segments, shared out by duration."""
    midi = notes[0].midi
    note_ends = cumulative_fractions([note.beats for note in notes])
    segment_ends = cumulative_fractions([end - start for start, end, _ in segments])

    if len(segments) >= len(notes):
        # A long note cut by a dip: each note takes one or more segments.
        groups = share(note_ends, segment_ends)
        return [(segments[g[0]][0], segments[g[-1]][1], midi) for g in groups]

    # Repeated notes merged: each segment holds one or more notes.
    placed = []
    for segment, group in zip(segments, share(segment_ends, note_ends), strict=True):
        placed += split_segment(segment, [notes[k] for k in group], times, level_db)
    return placed


def cumulative_fractions(durations):
    """[1, 1, 2] -> [0.25, 0.5, 1.0]"""
    durations = np.asarray(durations, dtype=float)
    return np.cumsum(durations) / durations.sum()


def share(small_ends, large_ends):
    """Cut the large list into len(small_ends) contiguous, non-empty groups.

    Group g ends at the large item whose cumulative fraction is closest to
    small_ends[g]. Returns lists of indices into the large list.
    """
    k, m = len(small_ends), len(large_ends)
    groups, first = [], 0
    for g in range(k - 1):
        # Leave at least one item for each of the groups still to make.
        last_allowed = m - (k - g)
        candidates = large_ends[first : last_allowed + 1]
        last = first + int(np.argmin(np.abs(candidates - small_ends[g])))
        groups.append(list(range(first, last + 1)))
        first = last + 1
    groups.append(list(range(first, m)))
    return groups


def split_segment(segment, notes, times, level_db):
    """Split one segment into several repeated notes, at the level dips."""
    start, end, midi = segment
    fractions = cumulative_fractions([note.beats for note in notes])[:-1]
    cuts = [start]
    for fraction in fractions:
        predicted = start + fraction * (end - start)
        lo = max(predicted - SPLIT_SEARCH_S, cuts[-1] + 0.05)
        hi = min(predicted + SPLIT_SEARCH_S, end - 0.05)
        window = (times >= lo) & (times <= hi)
        if window.any():
            cuts.append(float(times[window][np.argmin(level_db[window])]))
        else:
            cuts.append(predicted)
    cuts.append(end)
    return [(cuts[i], cuts[i + 1], midi) for i in range(len(notes))]
