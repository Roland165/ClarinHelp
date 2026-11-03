"""Compare what was played with the score, note by note."""

from typing import NamedTuple

import numpy as np

from clarinhelp.align import align
from clarinhelp.annotate import runs

# Cheaper than a missed + an extra note (2), so that one wrong note stays a wrong note.
# But two wrong notes in a row (3) become a missed + an extra note: usually a shift.
SUBSTITUTION_COST = 1.5


class Mistake(NamedTuple):
    kind: str  # "wrong", "missed" or "extra"
    position: int  # index in the score (for "extra": the score note that comes next)
    midi: int  # the note in the score, or the extra note played


def find_mistakes(score_midi, played_midi):
    """Mistakes that turn the score into what was played, from the notes alone."""
    return mistakes_from_pairs(
        align(score_midi, played_midi, substitution_cost=SUBSTITUTION_COST),
        score_midi,
        played_midi,
    )[0]


def mistakes_from_pairs(pairs, score_midi, played_midi):
    """Return the mistakes, and for each extra note the index of the played note."""
    mistakes, extra_played = [], {}
    position = 0
    for i, j in pairs:
        if i is None:
            mistake = Mistake("extra", position, played_midi[j])
            extra_played[len(mistakes)] = j
            mistakes.append(mistake)
            continue
        position = i + 1
        if j is None:
            mistakes.append(Mistake("missed", i, score_midi[i]))
        elif score_midi[i] != played_midi[j]:
            mistakes.append(Mistake("wrong", i, score_midi[i]))
    return mistakes, extra_played


def detect_mistakes(score, played):
    """Mistakes of a real performance, using the durations.

    score: list of ScoreNote. played: list of (start s, end s, written MIDI).

    Repeated notes are the hard case, because only a small dip in level separates
    them. Two of them played legato come out as one long note (it looks like a missed
    note), and one long note cut by a dip comes out as two (it looks like an extra
    note). The total duration tells them apart: a really skipped note leaves a silence,
    and a really extra note makes the whole thing longer.
    """
    score_midi = [note.midi for note in score]
    played_midi = [midi for _, _, midi in played]
    pairs = align(score_midi, played_midi, substitution_cost=SUBSTITUTION_COST)
    mistakes, extra_played = mistakes_from_pairs(pairs, score_midi, played_midi)

    def duration(j):
        return played[j][1] - played[j][0]

    matched = {i: j for i, j in pairs if i is not None and j is not None}
    played_right = [
        duration(j) / score[i].beats for i, j in matched.items() if score_midi[i] == played_midi[j]
    ]
    if not played_right:
        return mistakes  # no right note at all: no tempo to judge the durations with
    seconds_per_beat = np.median(played_right)
    run_of = {i: run for _, run in runs(score_midi) for i in run}

    # Same pitch as a neighbouring score note: the played note belongs to that run.
    extras_of_run = {}
    for index, j in extra_played.items():
        position = mistakes[index].position
        for i in (position - 1, position):
            if i in run_of and score_midi[i] == played_midi[j]:
                extras_of_run.setdefault(run_of[i][0], []).append(index)
                break

    ignored = set()
    for _, run in runs(score_midi):
        missed = [
            m
            for m, mistake in enumerate(mistakes)
            if mistake.kind == "missed" and mistake.position in run
        ]
        extras = extras_of_run.get(run[0], [])
        if not missed and not extras:
            continue

        heard = sum(duration(matched[i]) for i in run if i in matched)
        heard += sum(duration(extra_played[index]) for index in extras)
        # Positive: part of the run was not heard. Negative: more was heard than written.
        balance = sum(score[i].beats for i in run) - heard / seconds_per_beat

        for m in missed:
            beats = score[mistakes[m].position].beats
            if balance >= beats / 2:
                balance -= beats  # really skipped
            else:
                ignored.add(m)  # merged with its neighbour
        for index in extras:
            beats = duration(extra_played[index]) / seconds_per_beat
            if -balance >= beats / 2:
                balance += beats  # really extra
            else:
                ignored.add(index)  # one note cut in two

    return [mistake for m, mistake in enumerate(mistakes) if m not in ignored]


def score_mistakes(truth, detected, tolerance=2):
    """Count (found, false alarms, not found) by matching mistakes of the same kind.

    The position may differ a little: in C C C, nobody can say which C was skipped.
    """
    remaining = list(truth)
    found = 0
    for mistake in detected:
        match = next(
            (
                t
                for t in remaining
                if t.kind == mistake.kind and abs(t.position - mistake.position) <= tolerance
            ),
            None,
        )
        if match is not None:
            remaining.remove(match)
            found += 1
    return found, len(detected) - found, len(remaining)
