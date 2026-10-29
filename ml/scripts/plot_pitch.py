"""Plot the pitch curve YIN finds in a recording, in written notes.

    uv run python scripts/plot_pitch.py ../data/raw/scale_chromatic_01.wav

Saves the figure in ml/runs/ (not versioned).
"""

import argparse
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import soundfile as sf

from clarinhelp.pitch import (
    WRITTEN_LOWEST_MIDI,
    concert_to_written,
    hz_to_midi,
    midi_to_name,
)
from clarinhelp.yin import track

parser = argparse.ArgumentParser()
parser.add_argument("wav", type=Path)
parser.add_argument("--out", type=Path, default=Path("runs"))
args = parser.parse_args()

signal, sample_rate = sf.read(args.wav, dtype="float64")
if signal.ndim > 1:
    signal = signal[:, 0]

times, frequencies, rms = track(signal, sample_rate)
written = concert_to_written(hz_to_midi(frequencies))
level_db = 20 * np.log10(np.maximum(rms, 1e-6))

fig, (ax_pitch, ax_level) = plt.subplots(
    2, 1, figsize=(14, 8), sharex=True, gridspec_kw={"height_ratios": [3, 1]}
)

ax_pitch.plot(times, written, ".", markersize=3)
lowest = WRITTEN_LOWEST_MIDI
highest = int(np.nanmax(written)) + 1 if np.any(~np.isnan(written)) else lowest + 24
notes = np.arange(lowest, highest + 1)
ax_pitch.set_yticks(notes, [midi_to_name(m) for m in notes], fontsize=7)
ax_pitch.set_ylim(lowest - 1, highest + 1)
ax_pitch.grid(axis="y", alpha=0.3)
ax_pitch.set_ylabel("written note (YIN)")
ax_pitch.set_title(args.wav.name)

ax_level.plot(times, level_db)
ax_level.set_ylabel("level (dB)")
ax_level.set_xlabel("time (s)")
ax_level.grid(alpha=0.3)

args.out.mkdir(parents=True, exist_ok=True)
out_path = args.out / f"{args.wav.stem}_pitch.png"
fig.savefig(out_path, dpi=120, bbox_inches="tight")
print(f"saved {out_path}")
