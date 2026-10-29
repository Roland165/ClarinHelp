"""Pre-fill Audacity label files from the pitch track of each recording.

    uv run python scripts/prefill_labels.py ../data/raw/au_clair_clean_01.wav
    uv run python scripts/prefill_labels.py ../data/raw/*.wav

Writes one data/annotations/<name>.txt per recording (start, end, written note,
tab-separated), to import in Audacity with File > Import > Labels and correct by
ear. Existing files are never overwritten (they may already be corrected),
unless --force is given.
"""

import argparse
from pathlib import Path

import numpy as np
import soundfile as sf

from clarinhelp.labels import write_labels
from clarinhelp.notes import segment_notes
from clarinhelp.pitch import concert_to_written, hz_to_midi, midi_to_name
from clarinhelp.yin import track

# Finer than the live tuner (1024): about 5 ms per frame at 48 kHz, for precise
# note boundaries.
HOP_SIZE = 256

parser = argparse.ArgumentParser()
parser.add_argument("wavs", type=Path, nargs="+")
parser.add_argument("--out", type=Path, default=Path("../data/annotations"))
parser.add_argument("--force", action="store_true", help="overwrite existing label files")
args = parser.parse_args()

args.out.mkdir(parents=True, exist_ok=True)
for wav in args.wavs:
    out_path = args.out / f"{wav.stem}.txt"
    if out_path.exists() and not args.force:
        print(f"skip {out_path} (already exists)")
        continue

    signal, sample_rate = sf.read(wav, dtype="float64")
    if signal.ndim > 1:
        signal = signal[:, 0]
    times, frequencies, rms = track(signal, sample_rate, hop_size=HOP_SIZE)
    written = concert_to_written(hz_to_midi(frequencies))
    level_db = 20 * np.log10(np.maximum(rms, 1e-6))
    notes = segment_notes(times, written, level_db)

    write_labels(out_path, [(start, end, midi_to_name(midi)) for start, end, midi in notes])
    print(f"{out_path}: {len(notes)} notes")
