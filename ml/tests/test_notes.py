import numpy as np

from clarinhelp.notes import segment_notes

HOP = 0.005


def frames(*parts):
    """Build (times, midi, level) from (duration s, midi or None, level dB) parts."""
    midi, level = [], []
    for duration, note, db in parts:
        n = round(duration / HOP)
        midi += [np.nan if note is None else note] * n
        level += [db] * n
    return np.arange(len(midi)) * HOP, np.array(midi, dtype=float), np.array(level, dtype=float)


def test_two_different_notes():
    notes = segment_notes(
        *frames((0.5, None, -70), (0.5, 60, -20), (0.5, 62, -20), (0.5, None, -70))
    )
    assert [n[2] for n in notes] == [60, 62]
    assert abs(notes[0][0] - 0.5) < 0.01
    assert abs(notes[1][1] - 1.5) < 0.01


def test_repeated_note_split_by_level_dip():
    # Same pitch all along, a 12 dB dip in the middle (tonguing).
    notes = segment_notes(
        *frames((0.5, None, -70), (0.5, 60, -16), (0.03, 60, -28), (0.5, 60, -16), (0.5, None, -70))
    )
    assert [n[2] for n in notes] == [60, 60]


def test_short_glitch_is_dropped():
    notes = segment_notes(
        *frames((0.5, None, -70), (0.5, 60, -20), (0.02, 61, -20), (0.5, 62, -20))
    )
    assert [n[2] for n in notes] == [60, 62]


def test_quiet_pitch_is_silence():
    # A pitch found 40 dB under the playing level (room noise, reverb) is not a note.
    notes = segment_notes(*frames((0.5, 60, -20), (0.5, 64, -60), (0.5, None, -70)))
    assert [n[2] for n in notes] == [60]


def test_rounds_out_of_tune_notes():
    notes = segment_notes(*frames((0.5, None, -70), (0.5, 59.7, -20), (0.5, 64.3, -20)))
    assert [n[2] for n in notes] == [60, 64]
