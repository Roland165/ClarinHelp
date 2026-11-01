"""Convert the ABC scores to MusicXML for the web app (OpenSheetMusicDisplay reads MusicXML).

    uv run python scripts/export_musicxml.py

The ABC files in data/scores/ stay the only source: run this again after editing
one. Writes frontend/public/scores/<id>.musicxml and an index.json (id + title)
for the score menu.
"""

import json
from pathlib import Path

from music21 import converter

from clarinhelp.dataset import DATA

OUT = Path(__file__).parents[2] / "frontend" / "public" / "scores"

OUT.mkdir(parents=True, exist_ok=True)
index = []
for path in sorted((DATA / "scores").glob("*.abc")):
    score = converter.parse(path)
    part = score.parts[0]
    part.partName = "Clarinet in B♭"
    # music21 numbers the bars of an ABC file from 0; musicians count from 1.
    for measure in part.getElementsByClass("Measure"):
        measure.number += 1
    score.write("musicxml", fp=OUT / f"{path.stem}.musicxml")
    index.append({"id": path.stem, "title": score.metadata.title})
    print(f"{path.stem}: {score.metadata.title}")

index.sort(key=lambda tune: tune["title"])
with open(OUT / "index.json", "w", encoding="utf-8") as f:
    json.dump(index, f, indent=2, ensure_ascii=False)
    f.write("\n")
