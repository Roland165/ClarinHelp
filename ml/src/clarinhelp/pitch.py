"""Pitch helpers, mirrored from frontend/src/lib/pitch.ts.

The evaluation scripts must use exactly the same conventions as the browser,
otherwise a "wrong note" in the app and in the metrics would not mean the same thing.
Internally everything is *concert* MIDI; *written* pitch is only for display.
"""

import numpy as np

A4_HZ = 440.0
A4_MIDI = 69

# A Bb clarinet sounds a major second (2 semitones) below the written note.
BB_CLARINET_TRANSPOSITION = 2

WRITTEN_LOWEST_MIDI = 52  # E3
WRITTEN_HIGHEST_MIDI = 96  # C7

NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


def hz_to_midi(hz, a4=A4_HZ):
    """Frequency in Hz -> fractional MIDI number. Works on scalars and numpy arrays."""
    return A4_MIDI + 12 * np.log2(np.asarray(hz, dtype=float) / a4)


def midi_to_hz(midi, a4=A4_HZ):
    return a4 * 2 ** ((np.asarray(midi, dtype=float) - A4_MIDI) / 12)


def concert_to_written(concert_midi):
    return concert_midi + BB_CLARINET_TRANSPOSITION


def written_to_concert(written_midi):
    return written_midi - BB_CLARINET_TRANSPOSITION


def midi_to_name(midi: float) -> str:
    """60 -> 'C4' (scientific pitch notation, sharps only)."""
    rounded = int(round(midi))
    return NOTE_NAMES[rounded % 12] + str(rounded // 12 - 1)


def nearest_note(hz: float, a4=A4_HZ) -> tuple[int, float]:
    """Closest equal-tempered note and the deviation in cents (negative = flat)."""
    exact = float(hz_to_midi(hz, a4))
    midi = round(exact)
    return midi, (exact - midi) * 100
