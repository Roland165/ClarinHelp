from clarinhelp.feedback import Mistake, detect_mistakes, find_mistakes, score_mistakes
from clarinhelp.scores import ScoreNote


def quarters(*midis):
    return [ScoreNote(1, midi, 1.0) for midi in midis]


def played_notes(*notes):
    """Build played notes from (midi, duration s), one after the other."""
    played, time = [], 1.0
    for midi, duration in notes:
        played.append((time, time + duration, midi))
        time += duration
    return played


def test_no_mistake():
    assert find_mistakes([60, 62, 64], [60, 62, 64]) == []


def test_wrong_note():
    assert find_mistakes([60, 62, 64], [60, 61, 64]) == [Mistake("wrong", 1, 62)]


def test_missed_note():
    assert find_mistakes([60, 62, 64, 65], [60, 64, 65]) == [Mistake("missed", 1, 62)]


def test_extra_note():
    assert find_mistakes([60, 62, 64], [60, 62, 67, 64]) == [Mistake("extra", 2, 67)]


def test_two_wrong_notes_in_a_row_are_a_shift():
    assert find_mistakes([60, 62, 64, 65], [60, 61, 62, 65]) == [
        Mistake("extra", 1, 61),
        Mistake("missed", 2, 64),
    ]


def test_merged_repeated_notes_are_not_a_mistake():
    # C C played legato: one C lasting two beats.
    score = quarters(62, 60, 60, 64, 65)
    played = played_notes((62, 0.5), (60, 1.0), (64, 0.5), (65, 0.5))
    assert detect_mistakes(score, played) == []


def test_really_skipped_repeated_note_is_a_mistake():
    # C C with the second one skipped: one C lasting one beat only.
    score = quarters(62, 60, 60, 64, 65)
    played = played_notes((62, 0.5), (60, 0.5), (64, 0.5), (65, 0.5))
    assert [m.kind for m in detect_mistakes(score, played)] == ["missed"]


def test_note_cut_in_two_is_not_a_mistake():
    # One C cut by a dip: two pieces, but still one beat in total.
    score = quarters(62, 60, 64, 65)
    played = played_notes((62, 0.5), (60, 0.25), (60, 0.25), (64, 0.5), (65, 0.5))
    assert detect_mistakes(score, played) == []


def test_really_extra_repeated_note_is_a_mistake():
    # A second C of a full beat: the Cs last twice as long as written.
    score = quarters(62, 60, 64, 65)
    played = played_notes((62, 0.5), (60, 0.5), (60, 0.5), (64, 0.5), (65, 0.5))
    assert [m.kind for m in detect_mistakes(score, played)] == ["extra"]


def test_score_mistakes():
    truth = [Mistake("wrong", 3, 60), Mistake("missed", 10, 62), Mistake("extra", 20, 64)]
    detected = [
        Mistake("wrong", 3, 60),  # found
        Mistake("missed", 11, 62),  # found: close enough
        Mistake("wrong", 15, 64),  # false alarm
    ]
    assert score_mistakes(truth, detected) == (2, 1, 1)
