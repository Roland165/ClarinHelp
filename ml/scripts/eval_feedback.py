"""How well does ClarinHelp find the mistakes of a player?

    uv run python scripts/eval_feedback.py               # val split
    uv run python scripts/eval_feedback.py --split test  # final numbers only

Each recording is transcribed with YIN (live tuner settings) and compared with the
score the player was reading. The real mistakes are known: for an errors take they
are the differences between the original score and data/scores/errors/; every other
take was played as written, so anything reported there is a false alarm.
"""

import argparse
from pathlib import Path

import numpy as np
import soundfile as sf

from clarinhelp.dataset import DATA, recordings
from clarinhelp.feedback import detect_mistakes, find_mistakes, score_mistakes
from clarinhelp.notes import segment_notes
from clarinhelp.pitch import concert_to_written, hz_to_midi
from clarinhelp.scores import expected_notes
from clarinhelp.yin import track

parser = argparse.ArgumentParser()
parser.add_argument("--split", choices=["val", "test"], default="val")
parser.add_argument("--verbose", action="store_true", help="list the mistakes of each recording")
args = parser.parse_args()

print(f"{'recording':28s} {'mistakes':>8s} {'found':>5s} {'false alarms':>12s}")
total_truth = total_found = total_false = 0
for row in recordings(args.split):
    if row["tune"] == "scale_chromatic":
        continue
    name = Path(row["file"]).stem
    signal, sample_rate = sf.read(DATA / "raw" / row["file"], dtype="float64")
    if signal.ndim > 1:
        signal = signal[:, 0]
    times, frequencies, rms = track(signal, sample_rate)
    written = concert_to_written(hz_to_midi(frequencies))
    level_db = 20 * np.log10(np.maximum(rms, 1e-6))
    played = segment_notes(times, written, level_db)

    # An errors take is compared with the original score, the one it should match.
    reading = "clean" if row["take"] == "errors" else row["take"]
    score = expected_notes(DATA / "scores", row["tune"], reading)
    actual = expected_notes(DATA / "scores", row["tune"], row["take"])

    truth = find_mistakes([note.midi for note in score], [note.midi for note in actual])
    detected = detect_mistakes(score, played)
    found, false_alarms, _ = score_mistakes(truth, detected)
    total_truth += len(truth)
    total_found += found
    total_false += false_alarms
    print(f"{name:28s} {len(truth):8d} {found:5d} {false_alarms:12d}")
    if args.verbose:
        print("    truth:   ", [(m.kind, m.position) for m in truth])
        print("    detected:", [(m.kind, m.position) for m in detected])

print(f"{'total (' + args.split + ')':28s} {total_truth:8d} {total_found:5d} {total_false:12d}")
print(f"recall: {total_found / total_truth:.1%}")
print(f"precision: {total_found / max(1, total_found + total_false):.1%}")
