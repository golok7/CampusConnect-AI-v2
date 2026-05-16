from __future__ import annotations

import re
from dataclasses import dataclass, field

YEAR_PATTERN = re.compile(r"\b(19[9]\d|20[0-2]\d|2030|2031|2032|2033|2034|2035)\b")

# Matches both "CGPA: 8.8" and "8.8 CGPA" and "8.8 / 10"
GPA_PATTERN = re.compile(
    r"(?:cgpa|gpa|grade|score)[:\s]*(\d+\.?\d*)\s*(?:/\s*(\d+\.?\d*))?|"
    r"(\d+\.?\d*)\s*(?:/\s*(\d+\.?\d*))?\s*(?:cgpa|gpa)",
    re.IGNORECASE,
)

DEGREE_KEYWORDS = [
    "b.tech", "b.e.", "b.e", "m.tech", "m.e.", "m.e", "m.s.", "m.s",
    "b.sc", "m.sc", "b.sc.", "m.sc.", "bsc", "msc",
    "bachelor", "master", "phd", "ph.d", "diploma", "b.com", "b.a",
    "b.arch", "mba", "higher secondary", "secondary", "class xii", "class x",
    "10th", "12th", "hsc", "ssc",
]

# Score patterns that indicate a degree/result line, not an institution name
_SCORE_RE = re.compile(r"\b\d+\.?\d*\s*(?:cgpa|gpa|%|percent)\b", re.IGNORECASE)


def _is_degree_header_line(line: str) -> bool:
    """True if line looks like a degree/score header — not an institution name."""
    lower = line.lower().strip()
    for kw in DEGREE_KEYWORDS:
        if lower.startswith(kw) or f" {kw}" in lower:
            return True
    return bool(_SCORE_RE.search(line))


def _starts_new_edu_entry(line: str) -> bool:
    """True if this line begins a new education block (degree keyword at start)."""
    lower = line.lower().strip()
    for kw in DEGREE_KEYWORDS:
        if lower.startswith(kw):
            return True
    return False


@dataclass
class EducationEntry:
    institution: str
    degree: str | None = None
    branch: str | None = None
    graduation_year: int | None = None
    cgpa: float | None = None
    confidence: float = 0.8
    raw_text: str | None = None


def _normalize_gpa(value: float, denominator: float | None) -> float:
    if denominator is None:
        denom = 4.0 if value <= 4.0 else 10.0
    else:
        denom = denominator
    if denom <= 4.0:
        return round(value * 2.5, 2)
    return round(value, 2)


def _extract_gpa(text: str) -> float | None:
    m = GPA_PATTERN.search(text)
    if not m:
        return None
    try:
        value = float(m.group(1) or m.group(3))
        raw_denom = m.group(2) or m.group(4)
        denom = float(raw_denom) if raw_denom else None
        result = _normalize_gpa(value, denom)
        return result if result <= 10.0 else None
    except (ValueError, TypeError):
        return None


def _extract_year(text: str) -> int | None:
    """Return the latest (graduation) year found — handles '2023 – 2027' ranges."""
    matches = YEAR_PATTERN.findall(text)
    if not matches:
        return None
    years = [int(y) for y in matches]
    future = [y for y in years if y >= 2024]
    return max(future) if future else max(years)


def _extract_degree(text: str) -> str | None:
    lower = text.lower()
    for kw in DEGREE_KEYWORDS:
        if kw in lower:
            idx = lower.find(kw)
            return text[idx: idx + len(kw)].strip()
    return None


class EducationParser:
    def parse(self, lines: list[str]) -> list[EducationEntry]:
        entries: list[EducationEntry] = []
        blocks = self._split_into_blocks(lines)
        for block in blocks:
            text = " ".join(block)
            year = _extract_year(text)
            cgpa = _extract_gpa(text)
            degree = _extract_degree(text)

            # Institution: first non-date, non-number, non-degree-header line
            institution = next(
                (l for l in block
                 if len(l) > 4
                 and not re.match(r"^[\d\s/–\-,\.%]+$", l)
                 and not re.match(r"^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)", l, re.I)
                 and not _is_degree_header_line(l)),
                None,
            )

            # Fall back: if no clean institution found, use first non-empty line
            if not institution:
                institution = next((l for l in block if l.strip()), text[:80])

            confidence = 0.8
            raw_text_val = None
            if not year and not degree:
                confidence = 0.3
                raw_text_val = text[:200]

            entries.append(EducationEntry(
                institution=institution,
                degree=degree,
                graduation_year=year,
                cgpa=cgpa,
                confidence=confidence,
                raw_text=raw_text_val,
            ))

        entries.sort(key=lambda e: e.graduation_year or 0, reverse=True)
        return entries

    def _split_into_blocks(self, lines: list[str]) -> list[list[str]]:
        """
        Split on blank lines; also start a new block when a degree-keyword line
        appears after the first line (handles education entries with no blank separators).
        """
        blocks: list[list[str]] = []
        current: list[str] = []

        for line in lines:
            stripped = line.strip()
            if not stripped:
                if current:
                    blocks.append(current)
                    current = []
                continue

            # A new degree keyword after the first line starts a new entry
            if current and _starts_new_edu_entry(stripped):
                blocks.append(current)
                current = [line]
                continue

            current.append(line)

        if current:
            blocks.append(current)

        return blocks or [lines]
