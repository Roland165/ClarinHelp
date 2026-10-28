# ml/

Offline side of ClarinHelp: data preparation, model training and the evaluation
scripts that produce every number in the main README. Nothing here runs in the
live app; trained models are exported (ONNX / JSON) and shipped to the frontend.

```bash
uv sync          # creates .venv with the pinned Python and dependencies
uv run pytest    # tests
uv run ruff check .
```
