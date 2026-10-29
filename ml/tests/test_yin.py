import numpy as np
import pytest

from clarinhelp.pitch import hz_to_midi
from clarinhelp.yin import FRAME_SIZE, track, yin


def tone(frequency, sample_rate, harmonics=(1,), length=FRAME_SIZE):
    """Sum of sines: harmonics[k] is the amplitude of harmonic k+1."""
    t = np.arange(length) / sample_rate
    return sum(amp * np.sin(2 * np.pi * (k + 1) * frequency * t) for k, amp in enumerate(harmonics))


def cents_between(a, b):
    return abs(hz_to_midi(a) - hz_to_midi(b)) * 100


@pytest.mark.parametrize(
    "frequency, sample_rate",
    [
        (146.83, 44100),  # lowest clarinet note (written E3)
        (440, 44100),
        (440, 48000),
        (1046.5, 48000),
        (1864.66, 48000),  # around the top of the range
    ],
)
def test_pure_tones(frequency, sample_rate):
    result = yin(tone(frequency, sample_rate), sample_rate)
    assert result is not None
    assert cents_between(result[0], frequency) < 2


def test_clarinet_like_tone():
    # Low clarinet notes have strong odd harmonics and almost no even ones.
    result = yin(tone(196, 48000, harmonics=(1, 0, 0.6, 0, 0.4, 0, 0.2)), 48000)
    assert cents_between(result[0], 196) < 2


def test_silence():
    assert yin(np.zeros(FRAME_SIZE), 48000) is None


def test_white_noise():
    noise = np.random.default_rng(42).uniform(-1, 1, FRAME_SIZE)
    assert yin(noise, 48000) is None


def test_confident_on_clean_tone():
    assert yin(tone(440, 48000), 48000)[1] > 0.9


def test_track_follows_two_notes():
    # 1 s of A4 then 1 s of silence: the pitch must be there, then gone.
    signal = np.concatenate([tone(440, 48000, length=48000), np.zeros(48000)])
    times, frequencies, _ = track(signal, 48000)
    first, last = frequencies[times < 0.9], frequencies[times > 1.1]
    assert np.all(np.abs(hz_to_midi(first) - 69) < 0.02)
    assert np.all(np.isnan(last))
