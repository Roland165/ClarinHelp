from pathlib import Path

from clarinhelp.labels import read_labels, write_labels
from clarinhelp.scores import score_notes, score_path

SCORES = Path(__file__).parents[2] / "data" / "scores"


def test_score_path_per_take():
    assert score_path(SCORES, "twinkle", "clean") == SCORES / "twinkle.abc"
    assert score_path(SCORES, "twinkle", "errors") == SCORES / "errors" / "twinkle.abc"


def test_au_clair_starts_c_c_c_d():
    notes = score_notes(SCORES / "au_clair.abc")
    assert len(notes) == 44
    assert notes[:4] == [(1, 60), (1, 60), (1, 60), (1, 62)]
    assert notes[-1] == (16, 60)


def test_tied_note_counted_once():
    # Silent Night ends on a C4 tied over the last two bars.
    notes = score_notes(SCORES / "silent_night.abc")
    assert notes[-1] == (23, 60)


def test_labels_round_trip(tmp_path):
    notes = [(1.0, 1.5, "C4"), (1.5, 2.25, "D#4")]
    write_labels(tmp_path / "x.txt", notes)
    assert read_labels(tmp_path / "x.txt") == notes
