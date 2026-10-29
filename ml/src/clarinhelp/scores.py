"""Read the ABC scores of data/scores/ (written pitch for Bb clarinet)."""

from pathlib import Path

from music21 import converter

# Chromatic scale recordings: written E3 up to C6, one note per beat.
SCALE_NOTES = list(range(52, 85))


def score_path(scores_dir, tune, take):
    """The score that was actually played: errors and transposed takes have their own."""
    folder = {"errors": "errors", "transposed": "transposed"}.get(take, "")
    return Path(scores_dir) / folder / f"{tune}.abc"


def score_notes(path):
    """List of (bar number from 1, written MIDI), tied notes counted once."""
    part = converter.parse(path).parts[0]
    notes = []
    for note in part.recurse().notes:
        if note.tie is not None and note.tie.type in ("continue", "stop"):
            continue
        # music21 numbers the bars of an ABC file from 0.
        notes.append((note.measureNumber + 1, note.pitch.midi))
    return notes
