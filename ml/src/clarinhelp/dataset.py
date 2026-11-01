"""The recordings of data/ and their val/test split (fixed before recording, see data/README.md)."""

import csv
from pathlib import Path

DATA = Path(__file__).parents[3] / "data"

VAL_TUNES = {"scale_chromatic", "au_clair", "frere_jacques", "twinkle", "jingle_bells"}
TEST_TUNES = {
    "ode_to_joy",
    "saints",
    "amazing_grace",
    "greensleeves",
    "mary_lamb",
    "row_boat",
    "silent_night",
    "auld_lang_syne",
}


def recordings(split):
    """Rows of recordings.csv for one split: "val" or "test"."""
    tunes = {"val": VAL_TUNES, "test": TEST_TUNES}[split]
    with open(DATA / "recordings.csv", encoding="utf-8") as f:
        return [row for row in csv.DictReader(f) if row["tune"] in tunes]
