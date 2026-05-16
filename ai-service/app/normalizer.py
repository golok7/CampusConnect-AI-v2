import re
import unicodedata


def normalize_text(raw: str) -> str:
    """Strip control chars, collapse whitespace, preserve newlines."""
    # Remove non-printable control characters (Unicode Cc, Cf) except \n and \t
    cleaned = "".join(
        ch for ch in raw
        if ch in ("\n", "\t") or unicodedata.category(ch) not in ("Cc", "Cf")
    )
    # Collapse consecutive spaces/tabs to a single space, per line
    lines = cleaned.split("\n")
    normalized_lines = [re.sub(r"[ \t]+", " ", line).strip() for line in lines]
    text = "\n".join(normalized_lines)

    # Join hyphenated line breaks — PDF layout splits words like "opti-\nmization"
    text = re.sub(r"(\w)-\n(\w)", r"\1\2", text)

    # Join continuation lines that start with lowercase — these are sentence wraps,
    # not new lines, e.g. "...recommendation models\nusing PyTorch." → one line.
    # Guard: don't join across blank lines (two \n) or into bullet chars.
    text = re.sub(r"(?<!\n)\n([a-z][^\n])", lambda m: " " + m.group(1), text)

    return text
