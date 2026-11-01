"""CREPE pitch tracker (Kim et al., 2018), through torchcrepe.

CREPE is a CNN trained on thousands of annotated recordings to output the pitch
of a 64 ms frame. It works in a completely different way from YIN (learned, not
a hand-written formula), which makes it a good independent reference to check
YIN offline. Too slow for the browser on CPU, so it is not used in the app.
"""

import numpy as np
import torch
import torchcrepe

HOP_S = 0.01  # one estimate every 10 ms


def crepe_track(signal, sample_rate, model="full"):
    """Return times (s), frequency (Hz) and periodicity (0..1, CREPE's confidence).

    model: "full" (accurate, slow on CPU) or "tiny" (about 30x faster).
    """
    audio = torch.tensor(signal, dtype=torch.float32)[None]
    frequency, periodicity = torchcrepe.predict(
        audio,
        sample_rate,
        hop_length=int(sample_rate * HOP_S),
        fmin=120,
        fmax=torchcrepe.MAX_FMAX,  # about 2006 Hz, the top of CREPE's range
        model=model,
        # CREPE outputs 360 bins of 20 cents. The default Viterbi decoder returns bin
        # centres (errors up to 20 cents on a pure tone); a weighted average around
        # the best bin, as in the original CREPE, is within about 5 cents.
        decoder=torchcrepe.decode.weighted_argmax,
        return_periodicity=True,
        batch_size=512,
    )
    times = np.arange(frequency.shape[1]) * HOP_S
    return times, frequency[0].numpy(), periodicity[0].numpy()
