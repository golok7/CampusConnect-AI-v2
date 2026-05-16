from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime

BULLET_CHARS = {"•", "-", "*", "–", "▪", "◦"}

DATE_PATTERN = re.compile(
    r"\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
    r"Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)"
    r"[a-z]*\.?\s+(\d{4})\b",
    re.IGNORECASE,
)

# Matches "Role @ Company" or "Role | Company" or "Role – Company"
AT_SEPARATOR = re.compile(r"\s+[@|]\s+|\s+[–—]\s+(?=[A-Z])")

MONTH_MAP = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}


def strip_bullet(line: str) -> str:
    stripped = line.strip()
    while stripped and stripped[0] in BULLET_CHARS:
        stripped = stripped[1:].strip()
    return stripped


def _is_bullet(line: str) -> bool:
    s = line.strip()
    return bool(s) and s[0] in BULLET_CHARS


def _is_date_line(line: str) -> bool:
    """True if the line is primarily a date range with no other meaningful content."""
    stripped = line.strip()
    # Contains a month name and year
    if not DATE_PATTERN.search(stripped):
        return False
    # Remove date tokens and separators — if almost nothing is left, it's a date-only line
    residual = DATE_PATTERN.sub("", stripped)
    residual = re.sub(r"[\s\-–—,|/·•to]+", "", residual, flags=re.IGNORECASE)
    residual = re.sub(r"\bpresent\b", "", residual, flags=re.IGNORECASE)
    return len(residual) < 6


def _is_entry_header(line: str) -> bool:
    """Short non-bullet line that looks like a job-title / company header."""
    s = line.strip()
    if not s or len(s) < 4:
        return False
    if s[0] in BULLET_CHARS:
        return False
    # Continuation lines start with lowercase — never a header
    if s[0].islower():
        return False
    # Sentence fragments end with terminal punctuation — not a job title
    if s.endswith((".", ",", ";")):
        return False
    # Contains "@" or "|" (role @ company) — strong signal
    if re.search(r"[@|]", s):
        return True
    # Short title-case line (likely a company or role title)
    words = s.split()
    if len(words) <= 8 and sum(1 for w in words if w and w[0].isupper()) >= len(words) * 0.5:
        return True
    return False


def _parse_month_year(text: str) -> tuple[int, int] | None:
    m = DATE_PATTERN.search(text)
    if not m:
        return None
    month_str = m.group(1)[:3].lower()
    month = MONTH_MAP.get(month_str)
    year = int(m.group(2))
    return (year, month) if month else None


def _duration_months(start: tuple[int, int], end: tuple[int, int]) -> int:
    return (end[0] - start[0]) * 12 + (end[1] - start[1])


@dataclass
class ExperienceEntry:
    company: str | None = None
    role: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    duration_months: int | None = None
    bullets: list[str] = field(default_factory=list)
    confidence: float = 0.8


class ExperienceParser:
    def parse(self, lines: list[str]) -> list[ExperienceEntry]:
        blocks = self._split_blocks(lines)
        entries = [self._parse_block(b) for b in blocks if b]
        entries.sort(key=lambda e: _parse_month_year(e.start_date or "") or (0, 0), reverse=True)
        return entries

    def _parse_block(self, block: list[str]) -> ExperienceEntry:
        text = " ".join(block)
        all_date_matches = list(DATE_PATTERN.finditer(text))

        start_date: str | None = None
        end_date: str | None = None
        duration: int | None = None

        if len(all_date_matches) >= 1:
            m0 = all_date_matches[0]
            start_date = f"{m0.group(1)[:3].capitalize()} {m0.group(2)}"
        if len(all_date_matches) >= 2:
            m1 = all_date_matches[1]
            end_date = f"{m1.group(1)[:3].capitalize()} {m1.group(2)}"
        elif re.search(r"\bpresent\b", text, re.IGNORECASE):
            end_date = "Present"

        if start_date and end_date:
            start_parsed = _parse_month_year(start_date)
            end_parsed: tuple[int, int] | None = (
                (datetime.now().year, datetime.now().month)
                if end_date == "Present"
                else _parse_month_year(end_date)
            )
            if start_parsed and end_parsed:
                duration = _duration_months(start_parsed, end_parsed)

        bullets = [
            strip_bullet(line)
            for line in block
            if _is_bullet(line)
        ]

        # Non-bullet, non-date lines are headers (role / company)
        header_lines = [
            l.strip() for l in block
            if l.strip() and not _is_bullet(l) and not _is_date_line(l)
        ]

        role: str | None = None
        company: str | None = None

        if header_lines:
            first = header_lines[0]
            # Try "Role @ Company" split
            parts = AT_SEPARATOR.split(first, maxsplit=1)
            if len(parts) == 2:
                role = parts[0].strip()
                company = parts[1].strip()
            else:
                role = first
                company = header_lines[1] if len(header_lines) > 1 else None

        confidence = 0.8
        if not role and not company:
            confidence = 0.4

        return ExperienceEntry(
            company=company,
            role=role,
            start_date=start_date,
            end_date=end_date,
            duration_months=duration,
            bullets=bullets,
            confidence=confidence,
        )

    def _split_blocks(self, lines: list[str]) -> list[list[str]]:
        """
        Split on blank lines; also start a new block when we see a new entry
        header line after accumulating bullets (handles resumes with no blank
        lines between experience entries).
        """
        blocks: list[list[str]] = []
        current: list[str] = []
        saw_bullets = False

        for line in lines:
            stripped = line.strip()
            if not stripped:
                if current:
                    blocks.append(current)
                    current = []
                    saw_bullets = False
                continue

            # If we've already seen bullets and now hit a new entry header, split
            if saw_bullets and _is_entry_header(stripped) and not _is_date_line(stripped):
                blocks.append(current)
                current = [line]
                saw_bullets = False
                continue

            if _is_bullet(stripped):
                saw_bullets = True
            current.append(line)

        if current:
            blocks.append(current)

        return blocks or [lines]
