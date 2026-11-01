"""Compare YIN (live tuner settings) with CREPE, an independent detector.

    uv run python scripts/compare_pitch.py               # val split
    uv run python scripts/compare_pitch.py --split test  # final numbers only

Only frames in the middle half of each annotated note are compared (no attack,
no release, no silence). CREPE runs once per recording and is cached in
runs/crepe/ (the full model is slow on CPU).

  YIN-CREPE     median difference between the two detectors, in cents
  <10 c, <50 c  share of frames where they agree within 10 / 50 cents
  CREPE note    share of frames where CREPE is within 50 cents of the annotated
                note: an independent check of the annotations (and so of YIN's
                100% in eval_transcription.py)
  intonation    median deviation of the player from the equal-tempered note
"""

import argparse
from pathlib import Path

import numpy as np
import soundfile as sf

from clarinhelp.crepe import crepe_track
from clarinhelp.dataset import DATA, recordings
from clarinhelp.labels import read_labels
from clarinhelp.pitch import concert_to_written, hz_to_midi, name_to_midi
from clarinhelp.yin import track

CACHE = Path("runs/crepe")

parser = argparse.ArgumentParser()
parser.add_argument("--split", choices=["val", "test"], default="val")
args = parser.parse_args()


def cached_crepe(name, signal, sample_rate):
    path = CACHE / f"{name}.npz"
    if not path.exists():
        CACHE.mkdir(parents=True, exist_ok=True)
        times, frequency, periodicity = crepe_track(signal, sample_rate)
        np.savez(path, times=times, frequency=frequency, periodicity=periodicity)
    data = np.load(path)
    return data["times"], data["frequency"], data["periodicity"]


print(
    f"{'recording':28s} {'frames':>6s} {'YIN-CREPE':>9s} {'<10 c':>6s} {'<50 c':>6s} "
    f"{'CREPE note':>10s} {'intonation YIN / CREPE':>23s}"
)
results = []
for row in recordings(args.split):
    name = Path(row["file"]).stem
    signal, sample_rate = sf.read(DATA / "raw" / row["file"], dtype="float64")
    if signal.ndim > 1:
        signal = signal[:, 0]

    times, yin_hz, _ = track(signal, sample_rate)
    crepe_times, crepe_hz, _ = cached_crepe(name, signal, sample_rate)
    yin_written = concert_to_written(hz_to_midi(yin_hz))
    # CREPE gives a value every 10 ms: read it at the times of the YIN frames.
    crepe_written = concert_to_written(np.interp(times, crepe_times, hz_to_midi(crepe_hz)))

    # Annotated note of every frame in the middle half of a note, NaN elsewhere.
    expected = np.full(len(times), np.nan)
    for start, end, note in read_labels(DATA / "annotations" / f"{name}.txt"):
        quarter = (end - start) / 4
        expected[(times >= start + quarter) & (times <= end - quarter)] = name_to_midi(note)

    inside = ~np.isnan(expected) & ~np.isnan(yin_written)
    difference = 100 * np.abs(yin_written[inside] - crepe_written[inside])
    crepe_error = 100 * np.abs(crepe_written[inside] - expected[inside])
    result = (
        int(inside.sum()),
        np.median(difference),
        np.mean(difference < 10),
        np.mean(difference < 50),
        np.mean(crepe_error < 50),
        100 * np.median(yin_written[inside] - expected[inside]),
        100 * np.median(crepe_written[inside] - expected[inside]),
    )
    results.append(result)
    n, diff, within10, within50, crepe_note, yin_int, crepe_int = result
    print(
        f"{name:28s} {n:6d} {diff:7.1f} c {within10:6.1%} {within50:6.1%} "
        f"{crepe_note:10.1%} {yin_int:+10.1f} c / {crepe_int:+5.1f} c"
    )

n, diff, within10, within50, crepe_note, yin_int, crepe_int = np.mean(results, axis=0)
print(
    f"{'mean (' + args.split + ')':28s} {n:6.0f} {diff:7.1f} c {within10:6.1%} {within50:6.1%} "
    f"{crepe_note:10.1%} {yin_int:+10.1f} c / {crepe_int:+5.1f} c"
)
