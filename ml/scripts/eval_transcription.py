"""Evaluate YIN (live tuner settings) against the annotations.

    uv run python scripts/eval_transcription.py               # val split
    uv run python scripts/eval_transcription.py --split test  # final numbers only

Metrics (mir_eval, the standard in music information retrieval):
  notes F1      a note is right if its pitch is within 50 cents and it starts within
                50 ms of the annotated note (offsets ignored)
  pitch acc.    share of annotated frames where YIN is within 50 cents (raw pitch accuracy)
  false alarm   share of silent frames where YIN still reports a pitch
  intonation    median deviation of the player from the equal-tempered note, in cents

Careful: the annotation times were placed on YIN's own segments (forced alignment),
so "pitch acc." is close to 100% by construction and onsets are optimistic. An
independent detector (CREPE) is needed to check YIN's pitch itself.
"""

import argparse
from pathlib import Path

import mir_eval
import numpy as np
import soundfile as sf

from clarinhelp.dataset import DATA, recordings
from clarinhelp.labels import read_labels
from clarinhelp.notes import segment_notes
from clarinhelp.pitch import (
    concert_to_written,
    hz_to_midi,
    midi_to_hz,
    name_to_midi,
    written_to_concert,
)
from clarinhelp.yin import track

parser = argparse.ArgumentParser()
parser.add_argument("--split", choices=["val", "test"], default="val")
args = parser.parse_args()


def print_row(name, f1, pitch_accuracy, false_alarm, intonation):
    print(f"{name:28s} {f1:8.1%} {pitch_accuracy:10.1%} {false_alarm:11.1%} {intonation:+8.1f} c")


print(f"{'recording':28s} {'notes F1':>8s} {'pitch acc.':>10s} {'false alarm':>11s} intonation")
results = []
for row in recordings(args.split):
    name = Path(row["file"]).stem
    signal, sample_rate = sf.read(DATA / "raw" / row["file"], dtype="float64")
    if signal.ndim > 1:
        signal = signal[:, 0]
    labels = read_labels(DATA / "annotations" / f"{name}.txt")
    ref_intervals = np.array([[start, end] for start, end, _ in labels])
    ref_written = np.array([name_to_midi(note) for _, _, note in labels])

    # YIN as in the browser: 2048-sample frames, one every 1024 samples.
    times, frequencies, rms = track(signal, sample_rate)
    written = concert_to_written(hz_to_midi(frequencies))
    level_db = 20 * np.log10(np.maximum(rms, 1e-6))

    # Notes: mir_eval compares pitches in Hz, so both sides go back to concert pitch.
    est = segment_notes(times, written, level_db)
    est_intervals = np.array([[start, end] for start, end, _ in est])
    _, _, f1, _ = mir_eval.transcription.precision_recall_f1_overlap(
        ref_intervals,
        midi_to_hz(written_to_concert(ref_written)),
        est_intervals,
        midi_to_hz(written_to_concert(np.array([midi for _, _, midi in est]))),
        offset_ratio=None,
    )

    # Frames: the annotated pitch at every YIN frame (0 Hz = silence).
    ref_freq = np.zeros(len(times))
    for (start, end), midi in zip(ref_intervals, ref_written, strict=True):
        ref_freq[(times >= start) & (times < end)] = midi_to_hz(written_to_concert(midi))
    melody = mir_eval.melody.evaluate(times, ref_freq, times, np.nan_to_num(frequencies))

    # Intonation: median deviation over the middle half of each note (no attack, no release).
    deviations = []
    for (start, end), midi in zip(ref_intervals, ref_written, strict=True):
        quarter = (end - start) / 4
        inside = (times >= start + quarter) & (times <= end - quarter) & ~np.isnan(written)
        if inside.any():
            deviations.append(100 * np.median(written[inside] - midi))
    intonation = np.median(deviations)

    result = (f1, melody["Raw Pitch Accuracy"], melody["Voicing False Alarm"], intonation)
    results.append(result)
    print_row(name, *result)

print_row(f"mean ({args.split})", *np.mean(results, axis=0))
