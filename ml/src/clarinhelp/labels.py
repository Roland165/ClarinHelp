"""Audacity label files: one note per line, "start<TAB>end<TAB>written note"."""


def write_labels(path, notes):
    """notes: list of (start s, end s, note name)."""
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        for start, end, name in notes:
            f.write(f"{start:.3f}\t{end:.3f}\t{name}\n")


def read_labels(path):
    notes = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            start, end, name = line.rstrip("\n").split("\t")
            notes.append((float(start), float(end), name.strip()))
    return notes
