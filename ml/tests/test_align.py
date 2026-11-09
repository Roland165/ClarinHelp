from clarinhelp.align import align


def test_identical():
    assert align("CDE", "CDE") == [(0, 0), (1, 1), (2, 2)]


def test_wrong_note():
    assert align("CDE", "CFE") == [(0, 0), (1, 1), (2, 2)]


def test_no_substitution():
    # D is missing and F is extra, never "F instead of D".
    pairs = align("CDE", "CFE", substitution_cost=3)
    assert sorted(pairs, key=str) == sorted([(0, 0), (1, None), (None, 1), (2, 2)], key=str)


def test_missing_note():
    assert align("CDEF", "CEF") == [(0, 0), (1, None), (2, 1), (3, 2)]


def test_extra_note():
    assert align("CDE", "CDXE") == [(0, 0), (1, 1), (None, 2), (2, 3)]


def test_free_end_keeps_the_start_of_a_repeated_tune():
    assert align("CDECDE", "CDE", free_end=True) == [(0, 0), (1, 1), (2, 2)]
    # Without it, the played notes would go to the last repetition just as well.
    assert len(align("CDECDE", "CDE")) == 6


def test_free_end_still_finds_a_missing_note():
    assert align("CDEFG", "CEF", free_end=True) == [(0, 0), (1, None), (2, 1), (3, 2)]


def test_free_end_goes_as_far_as_possible_on_equal_costs():
    # "missed D then C" and "extra C then stop" cost the same: the first one wins.
    pairs = align("EDDC", "EDC", free_end=True)
    assert (3, 2) in pairs  # the last C is matched, not extra
    assert len([p for p in pairs if p[1] is None]) == 1  # one of the Ds is missing


def test_empty():
    assert align("CD", "") == [(0, None), (1, None)]
    assert align("", "CD") == [(None, 0), (None, 1)]
