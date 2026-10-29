from clarinhelp.align import align


def test_identical():
    assert align("CDE", "CDE") == [(0, 0), (1, 1), (2, 2)]


def test_wrong_note():
    assert align("CDE", "CFE") == [(0, 0), (1, 1), (2, 2)]


def test_missing_note():
    assert align("CDEF", "CEF") == [(0, 0), (1, None), (2, 1), (3, 2)]


def test_extra_note():
    assert align("CDE", "CDXE") == [(0, 0), (1, 1), (None, 2), (2, 3)]


def test_empty():
    assert align("CD", "") == [(0, None), (1, None)]
    assert align("", "CD") == [(None, 0), (None, 1)]
