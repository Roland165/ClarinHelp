import numpy as np

from clarinhelp.crepe import crepe_track
from clarinhelp.pitch import hz_to_midi


def test_finds_a_pure_tone():
    # The tiny model keeps the test fast; the evaluation uses the full one.
    sample_rate = 16000
    t = np.arange(sample_rate) / sample_rate
    times, frequency, periodicity = crepe_track(np.sin(2 * np.pi * 440 * t), sample_rate, "tiny")
    middle = (times > 0.2) & (times < 0.8)
    assert np.all(np.abs(hz_to_midi(frequency[middle]) - 69) * 100 < 10)
    assert np.all(periodicity[middle] > 0.5)
