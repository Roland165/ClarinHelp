"""Read the ABC scores of data/scores/ (written pitch for Bb clarinet)."""

from pathlib import Path
from typing import NamedTuple

from music21 import converter


class ScoreNote(NamedTuple):
    bar: int | None  # from 1, None for the scale
    midi: int  # written pitch
    beats: float  # duration in quarter notes


# Chromatic scale recordings: written E3 up to C6, one note per beat.
SCALE_NOTES = [ScoreNote(None, midi, 1.0) for midi in range(52, 85)]


def score_path(scores_dir, tune, take):
    """The score that was actually played: errors and transposed takes have their own."""
    folder = {"errors": "errors", "transposed": "transposed"}.get(take, "")
    return Path(scores_dir) / folder / f"{tune}.abc"


def score_notes(path):
    """List of ScoreNote. Tied notes are one note, with their durations added."""
    part = converter.parse(path).parts[0]
    notes = []
    for note in part.recurse().notes:
        if note.tie is not None and note.tie.type in ("continue", "stop"):
            previous = notes[-1]
            notes[-1] = previous._replace(beats=previous.beats + float(note.quarterLength))
            continue
        # music21 numbers the bars of an ABC file from 0.
        notes.append(ScoreNote(note.measureNumber + 1, note.pitch.midi, float(note.quarterLength)))
    return notes


def expected_notes(scores_dir, tune, take):
    """The notes played in a recording, from recordings.csv's tune and take."""
    if tune == "scale_chromatic":
        return SCALE_NOTES
    return score_notes(score_path(scores_dir, tune, take))
