"""Write the annotation labels of each recording by placing its score on the audio.

    uv run python scripts/prefill_labels.py                     # every recording
    uv run python scripts/prefill_labels.py au_clair_clean_01   # just one

Note names come from the score that was played (see recordings.csv), timings
from the pitch track. Writes data/annotations/<name>.txt (start, end, written
note, tab-separated), to open in Audacity with File > Import > Labels and check.
Existing files are never overwritten (they may already be corrected), unless
--force is given.
"""

import argparse
import csv
from pathlib import Path

import numpy as np
import soundfile as sf

from clarinhelp.annotate import fit_score
from clarinhelp.labels import write_labels
from clarinhelp.notes import segment_notes
from clarinhelp.pitch import concert_to_written, hz_to_midi, midi_to_name
from clarinhelp.scores import expected_notes
from clarinhelp.yin import track

DATA = Path("../data")
# Finer than the live tuner (1024): about 5 ms per frame at 48 kHz, for precise
# note boundaries.
HOP_SIZE = 256


def annotate(row):
    """Place the score of one recording; return the report lines."""
    name = Path(row["file"]).stem
    signal, sample_rate = sf.read(DATA / "raw" / row["file"], dtype="float64")
    if signal.ndim > 1:
        signal = signal[:, 0]
    times, frequencies, rms = track(signal, sample_rate, hop_size=HOP_SIZE)
    written = concert_to_written(hz_to_midi(frequencies))
    level_db = 20 * np.log10(np.maximum(rms, 1e-6))

    score = expected_notes(DATA / "scores", row["tune"], row["take"])
    segments = segment_notes(times, written, level_db)
    notes, missing, extra = fit_score(score, segments, times, level_db)

    write_labels(
        DATA / "annotations" / f"{name}.txt",
        [(start, end, midi_to_name(midi)) for start, end, midi in notes],
    )
    report = [f"{name}: {len(notes)}/{len(score)} notes placed"]
    for i in missing:
        bar = f"bar {score[i].bar} " if score[i].bar else ""
        report.append(f"    not found: {bar}{midi_to_name(score[i].midi)}")
    for start, end, midi in extra:
        report.append(f"    ignored: {start:.2f}-{end:.2f} s {midi_to_name(midi)}")
    return report


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("names", nargs="*", help="recording names without .wav (default: all)")
    parser.add_argument("--force", action="store_true", help="overwrite existing label files")
    args = parser.parse_args()

    with open(DATA / "recordings.csv", encoding="utf-8") as f:
        rows = [
            row
            for row in csv.DictReader(f)
            if not args.names or Path(row["file"]).stem in args.names
        ]

    (DATA / "annotations").mkdir(exist_ok=True)
    todo = []
    for row in rows:
        out_path = DATA / "annotations" / f"{Path(row['file']).stem}.txt"
        if out_path.exists() and not args.force:
            print(f"skip {out_path} (already exists)")
        else:
            todo.append(row)

    for row in todo:
        print("\n".join(annotate(row)))


if __name__ == "__main__":
    main()
