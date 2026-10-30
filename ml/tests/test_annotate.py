import numpy as np

from clarinhelp.annotate import fit_score, runs, share
from clarinhelp.scores import ScoreNote

TIMES = np.arange(0, 10, 0.005)
FLAT = np.full(len(TIMES), -20.0)


def notes(*pairs):
    return [ScoreNote(1, midi, beats) for midi, beats in pairs]


def test_runs():
    assert runs([60, 60, 62, 60]) == [(60, [0, 1]), (62, [2]), (60, [3])]


def test_share():
    # A whole note then three quarters, on three segments of 2.0, 0.55 and 1.15 s:
    # the last segment holds two notes (au_clair_clean_01, bars 4-5).
    segment_ends = np.cumsum([2.0, 0.55, 1.15]) / 3.7
    note_ends = np.cumsum([4, 1, 1, 1]) / 7
    assert share(segment_ends, note_ends) == [[0], [1], [2, 3]]


def test_one_to_one():
    score = notes((60, 1), (62, 1), (64, 2))
    segments = [(1.0, 1.5, 60), (1.5, 2.0, 62), (2.0, 3.0, 64)]
    placed, missing, extra = fit_score(score, segments, TIMES, FLAT)
    assert placed == segments
    assert missing == [] and extra == []


def test_merged_repeated_notes_split_at_level_dip():
    score = notes((60, 1), (60, 1), (62, 1))
    level = FLAT.copy()
    level[(TIMES > 1.42) & (TIMES < 1.44)] = -30  # tonguing, a bit before the middle
    segments = [(1.0, 2.0, 60), (2.0, 2.5, 62)]
    placed, _, _ = fit_score(score, segments, TIMES, level)
    assert [midi for _, _, midi in placed] == [60, 60, 62]
    assert 1.42 < placed[0][1] < 1.44
    assert placed[1][0] == placed[0][1]


def test_long_note_cut_by_dip_stays_one_note():
    score = notes((60, 2), (62, 1))
    segments = [(1.0, 1.6, 60), (1.62, 2.0, 60), (2.0, 2.5, 62)]
    placed, _, _ = fit_score(score, segments, TIMES, FLAT)
    assert placed == [(1.0, 2.0, 60), (2.0, 2.5, 62)]


def test_missing_and_extra():
    score = notes((60, 1), (62, 1), (64, 1))
    segments = [(1.0, 1.5, 60), (1.5, 1.55, 61), (2.0, 2.5, 64)]
    placed, missing, extra = fit_score(score, segments, TIMES, FLAT)
    assert [midi for _, _, midi in placed] == [60, 64]
    assert missing == [1]
    assert extra == [(1.5, 1.55, 61)]
