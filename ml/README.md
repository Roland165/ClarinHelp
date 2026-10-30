# ml/

Offline side of ClarinHelp: data preparation, model training and the evaluation
scripts that produce every number in the main README. Nothing here runs in the
live app; trained models are exported (ONNX / JSON) and shipped to the frontend.

```bash
uv sync          # creates .venv with the pinned Python and dependencies
uv run pytest    # tests
uv run ruff check .
```

Scripts:

```bash
# pitch curve found by YIN in a recording, saved in runs/
uv run python scripts/plot_pitch.py ../data/raw/scale_chromatic_01.wav

# annotation labels of every recording, from its score (see data/README.md)
uv run python scripts/prefill_labels.py

# compare label files with the scores (useful after editing labels by hand)
uv run python scripts/check_labels.py
```
