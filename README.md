# ClarinHelp

A practice companion for beginner clarinettists, running in the browser.

## Current state: a real-time tuner

Play a note and ClarinHelp shows the written note for a B♭ clarinet and a needle showing how many cents you are off. Green within ±5 cents, orange within ±15, red beyond. Just like a real tuner

How it works:

```
microphone -> AudioWorklet ( with YIN ) -> smoothing + silence threshold -> tuner
```

- **Audio capture**: the Web Audio API with an AudioWorklet, so the analysis runs
  on the audio thread and never blocks the page. Voice-call processing
  (echo cancellation, noise suppression, auto gain) is turned off.
- **Pitch detection**: [YIN](https://hal.science/hal-05067244/document), written from scratch
  in TypeScript, on a 2048-sample sliding window analysed every 1024 samples.
- **Smoothing**: a median over the last 3 frames removes isolated octave errors,
  then exponential smoothing steadies the needle.
- **Silence threshold**: follows the player's own loudness (20 dB under the recent
  playing level) and holds still during silences, so piano notes still count after a forte.

The pitch and transposition helpers exist in both TypeScript (live app) and Python
(offline evaluation) and are unit-tested on both sides. Accuracy on real clarinet
recordings has not been measured yet.

## Running locally

Requirements: Node ≥ 22.12, [uv](https://docs.astral.sh/uv/).

```bash
# web app
cd frontend
npm install
npm run dev     # then open the address shown

# Python side (evaluation, later training)
cd ml
uv sync
uv run pytest
```

## Sources

Deep learning with sound:
- https://www.youtube.com/watch?v=fMqL5vckiU0&list=PL-wATfeyAMNrtbkCNsLcpoAyBBRJZVlnf
- https://www.youtube.com/watch?v=iCwMQJnKk2c&list=PL-wATfeyAMNqIee7cH3q1bh4QJFAaeNv0

YIN:
- https://hal.science/hal-05067244/document
- https://github.com/ABSounds/YIN-Pitch
