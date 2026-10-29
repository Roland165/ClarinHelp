"""Cut a pitch track into notes.

Used to pre-fill the annotation labels: the result is only a first draft that is
corrected by ear in Audacity, never ground truth by itself.
"""

import numpy as np

# Frames quieter than this under the loudest part of the file are silence.
GATE_BELOW_PEAK_DB = 30.0
# Two repeated notes (C C) have the same pitch: only the tonguing separates them,
# and it shows up as a short dip in level (about 12 dB in our recordings).
DIP_DB = 6.0
DIP_WINDOW_S = 0.1
# Shorter than this is a glitch (attack, slide between two notes), not a note.
MIN_NOTE_S = 0.06


def segment_notes(times, written_midi, level_db):
    """Return a list of (start s, end s, written MIDI) from per-frame values.

    written_midi is NaN where no pitch was found.
    """
    hop = times[1] - times[0]
    gate = np.percentile(level_db, 95) - GATE_BELOW_PEAK_DB
    sounding = ~np.isnan(written_midi) & (level_db > gate)
    note = np.where(sounding, np.round(np.nan_to_num(written_midi)), 0).astype(int)
    note[level_dips(level_db, round(DIP_WINDOW_S / hop))] = 0

    notes = []
    start = 0
    for i in range(1, len(note) + 1):
        if i == len(note) or note[i] != note[start]:
            if note[start] and (i - start) * hop >= MIN_NOTE_S:
                notes.append((float(times[start]), float(times[i - 1]), int(note[start])))
            start = i
    return notes


def level_dips(level_db, window):
    """Indices of frames that are the bottom of a dip of at least DIP_DB on both sides."""
    dips = []
    for i in range(window, len(level_db) - window):
        around = level_db[i - window : i + window + 1]
        before, after = level_db[i - window : i], level_db[i + 1 : i + window + 1]
        if (
            level_db[i] == around.min()
            and before.max() - level_db[i] >= DIP_DB
            and after.max() - level_db[i] >= DIP_DB
        ):
            dips.append(i)
    return np.array(dips, dtype=int)
