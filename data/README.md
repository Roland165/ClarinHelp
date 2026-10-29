# data/

Audio recordings and downloaded corpora are NOT committed.
This folder only holds documentation and small annotation files.

The test set is NEVER used to tune anything.

## What the recordings are for

Nothing in ClarinHelp is trained on these recordings (except the optional squeak
detector). They are **evaluation data**: they tell us how well pitch detection,
transcription, score following and piece recognition work on a real clarinet,
played by a real (beginner-level) player.

## Repertoire

12 public-domain tunes, beginner range (written G3 to C6). The scores used for
recording are in `data/scores/` (added before the recording session), so that
what is played matches what the app expects note for note.

| id | Tune | Split |
|---|---|---|
| `au_clair` | Au clair de la lune | val |
| `frere_jacques` | Frère Jacques | val |
| `twinkle` | Ah ! vous dirai-je, maman (Twinkle Twinkle) | val |
| `jingle_bells` | Jingle Bells | val |
| `ode_to_joy` | Ode to Joy (Beethoven) | test |
| `saints` | When the Saints Go Marching In | test |
| `amazing_grace` | Amazing Grace | test |
| `greensleeves` | Greensleeves | test |
| `scarborough` | Scarborough Fair | test |
| `oh_susanna` | Oh! Susanna | test |
| `brahms_lullaby` | Brahms' Lullaby | test |
| `auld_lang_syne` | Auld Lang Syne | test |

**The split is by tune, fixed before recording.** Every threshold and parameter is
tuned on the `val` tunes only. The `test` tunes are only used to produce the final
numbers. Splitting by tune (not by take) means we never evaluate on a melody the
system was tuned on.

## Recording setup

- Software: Audacity (or any recorder that writes WAV).
- Format: **WAV, mono, 48 kHz, 16 or 24 bit**. No MP3: compression alters the sound.
- Mic: the USB mic, about 50 cm in front of the clarinet, at the height of the
  lower joint (the sound comes out of the tone holes as much as the bell).
- Same room and same mic position for every session, if possible.
- Levels: loudest notes peak around -6 dB, never touching 0 dB (clipping).
- Tune the instrument first (with the ClarinHelp tuner), A4 = 440 Hz.
- Leave about 2 s of silence at the start and the end of every file.

## What to record

### 1. Chromatic scale (pitch accuracy)

Written E3 up to C6, one note per beat at ♩ = 60, each note held for the whole beat.

- `scale_chromatic_01.wav`, `scale_chromatic_02.wav` (2 takes)

### 2. Tunes (transcription, alignment, recognition)

For **each** of the 12 tunes:

| Take | File name | How to play it |
|---|---|---|
| clean | `<id>_clean_01.wav` | As written, with a metronome, at the tempo on the score |
| free | `<id>_free_01.wav` | No metronome, noticeably slower or faster, with some rubato |
| errors | `<id>_errors_01.wav` | 3 to 5 **deliberate** mistakes: wrong notes, one skipped note, one extra note. Write down what you did and where (see below) |

For 4 tunes only (2 val, 2 test): one more take in **another key**,
`<id>_transposed_01.wav`, for example a whole tone higher. Write down the interval.

That makes 2 + 12 × 3 + 4 = **42 files**, roughly 30 minutes of audio.

Recognition queries ("3 s / 5 s / 10 s of playing, starting anywhere") are cut
automatically from these files, so there is nothing extra to record for them.

### 3. Squeaks (optional, only if we build the squeak detector)

`squeak_01.wav` … : free playing with deliberate squeaks every few seconds.

## Where files go

```
data/
├── raw/                 # your WAV files (gitignored, keep a backup elsewhere)
├── recordings.csv       # one line per file (versioned)
└── annotations/         # note labels, one .txt per file (versioned)
```

`recordings.csv` columns:

```
file,tune,take,tempo_bpm,transposition,notes
ode_to_joy_clean_01.wav,ode_to_joy,clean,100,0,
ode_to_joy_errors_01.wav,ode_to_joy,errors,100,0,"bar 3: E instead of F; bar 6: skipped G"
saints_transposed_01.wav,saints,transposed,,+2,
```

- `tempo_bpm` is empty for `free` takes.
- `transposition` is in semitones (written), `+2` = a whole tone higher.
- `notes` describes the deliberate mistakes in `errors` takes.

## Annotation

Ground truth for transcription and alignment is a list of the notes actually
played, with their start and end times. Format: an Audacity label track exported
as text (`File > Export > Export Labels`), one line per note:

```
2.013	2.498	C5
2.498	2.990	D5
```

Columns: start (s), end (s), **written** note name.

To save time, a script will pre-fill these labels from the score and the
transcription, and you only correct them in Audacity, listening and looking at the
spectrogram. The pre-filling
could bias the labels towards the system's output, so every label must be checked
by ear, not just accepted.
