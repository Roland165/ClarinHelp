import numpy as np
import pytest

from clarinhelp.pitch import (
    WRITTEN_LOWEST_MIDI,
    concert_to_written,
    hz_to_midi,
    midi_to_hz,
    midi_to_name,
    nearest_note,
    written_to_concert,
)


def test_a4_is_440_hz():
    assert hz_to_midi(440) == pytest.approx(69)
    assert midi_to_hz(69) == pytest.approx(440)


def test_works_on_arrays():
    np.testing.assert_allclose(hz_to_midi([220, 440, 880]), [57, 69, 81])


def test_written_c5_sounds_concert_bb4():
    assert written_to_concert(72) == 70
    assert midi_to_name(written_to_concert(72)) == "A#4"


def test_concert_a4_reads_as_written_b4():
    midi, _ = nearest_note(440)
    assert midi_to_name(concert_to_written(midi)) == "B4"


def test_lowest_written_e3_sounds_d3():
    assert midi_to_name(WRITTEN_LOWEST_MIDI) == "E3"
    assert midi_to_hz(written_to_concert(WRITTEN_LOWEST_MIDI)) == pytest.approx(146.83, abs=0.01)


@pytest.mark.parametrize("offset_cents", [-40, -20, 0, 10, 45])
def test_nearest_note_cents(offset_cents):
    midi, cents = nearest_note(midi_to_hz(69 + offset_cents / 100))
    assert midi == 69
    assert cents == pytest.approx(offset_cents)


def test_names():
    assert midi_to_name(60) == "C4"
    assert midi_to_name(61) == "C#4"
    assert midi_to_name(96) == "C7"
