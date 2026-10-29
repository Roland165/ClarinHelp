"""Compare each label file with the score that was played, and list what to check.

    uv run python scripts/check_labels.py
    uv run python scripts/check_labels.py au_clair_clean_01

A difference is not always a labelling mistake: an extra or wrong note may really
have been played. Listen to each spot in Audacity and keep what was played.
"""

import argparse
import csv
from pathlib import Path

from clarinhelp.align import align
from clarinhelp.labels import read_labels
from clarinhelp.pitch import midi_to_name
from clarinhelp.scores import SCALE_NOTES, score_notes, score_path

DATA = Path("../data")

parser = argparse.ArgumentParser()
parser.add_argument("names", nargs="*", help="recording names without .wav (default: all)")
args = parser.parse_args()

with open(DATA / "recordings.csv", encoding="utf-8") as f:
    recordings = list(csv.DictReader(f))

for row in recordings:
    name = Path(row["file"]).stem
    labels_path = DATA / "annotations" / f"{name}.txt"
    if (args.names and name not in args.names) or not labels_path.exists():
        continue

    if row["tune"] == "scale_chromatic":
        expected = [(None, midi) for midi in SCALE_NOTES]
    else:
        expected = score_notes(score_path(DATA / "scores", row["tune"], row["take"]))
    expected_names = [midi_to_name(midi) for _, midi in expected]
    labels = read_labels(labels_path)

    issues = []
    last_time = 0.0
    for i, j in align(expected_names, [label for _, _, label in labels]):
        bar = f"bar {expected[i][0]}" if i is not None and expected[i][0] else ""
        if i is not None and j is not None:
            start, end, label = labels[j]
            if label != expected_names[i]:
                issues.append(f"{start:7.2f} s  {bar}: label {label}, score {expected_names[i]}")
            last_time = end
        elif j is None:
            issues.append(f"~{last_time:6.2f} s  {bar}: score {expected_names[i]}, no label")
        else:
            start, end, label = labels[j]
            issues.append(f"{start:7.2f} s  extra label {label}")
            last_time = end

    print(f"{name}: {len(labels)} labels, {len(expected)} in the score, {len(issues)} to check")
    for issue in issues:
        print("    " + issue)
