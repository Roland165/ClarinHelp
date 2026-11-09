# ClarinHelp

A practice companion for beginner clarinettists, running in the browser.

## Current state: a tuner, and feedback on a whole tune

**Tuner.** Play a note and ClarinHelp shows the written note for a B♭ clarinet and a needle showing how many cents you are off. Green within ±5 cents, orange within ±15, red beyond. Just like a real tuner

**Practice.** Choose a tune, press Record and play: a cursor follows you on the score,
and every note gets its color as you go (green: in tune, orange: more than 25 cents
off, red: wrong or missed), with the mistakes listed in words. You can stop anywhere;
for now the take has to start at the beginning of the tune.

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
(offline evaluation) and are unit-tested on both sides.

## Measured on real recordings

I recorded 42 files on my clarinet (2 chromatic scales and 12 folk tunes, each played
clean, freely, with deliberate mistakes, and 4 of them in another key) and annotated
every note ([data/README.md](data/README.md)). They are split by tune: 4 tunes for
validation, 8 kept aside for the final test numbers.

YIN, with the exact settings of the live tuner, compared to
[CREPE](https://arxiv.org/abs/1802.06182) (a neural pitch tracker, run offline) on
the sustained part of every note of the validation recordings (16 files, 9,975 frames):

| | |
|---|---|
| Frames where YIN and CREPE are more than 50 cents apart (wrong note, octave error) | 0 (largest gap: 20.6 cents) |
| Median gap between YIN and CREPE | 5.1 cents |
| Frames within 10 cents | 84.1 % |

CREPE itself is only precise to about 5 cents (measured on pure tones), so the two
agree within the precision of the reference. Reproduce with
`uv run python scripts/compare_pitch.py` in `ml/`.

Finding the mistakes, on the 14 tune takes of the validation set (15 deliberate
mistakes, in the 4 errors takes): 14 found, 2 false alarms. These rules were tuned on
these same tunes and 15 mistakes is few, so these numbers are optimistic; the final
ones will come from the test tunes. Reproduce with
`uv run python scripts/eval_feedback.py` in `ml/`.

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
