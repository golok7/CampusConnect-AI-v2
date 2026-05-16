from __future__ import annotations

import re
from dataclasses import dataclass

DATE_PATTERN = re.compile(
    r"\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
    r"Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)"
    r"[a-z]*\.?\s+(\d{4})\b",
    re.IGNORECASE,
)

KNOWN_ISSUERS = [
    "AWS", "Amazon", "Google", "Microsoft", "Coursera", "Udemy",
    "LinkedIn Learning", "Oracle", "Cisco", "CompTIA", "IBM",
    "Meta", "Salesforce", "HashiCorp", "RedHat", "Red Hat",
    "Databricks", "Snowflake", "MongoDB University",
]


@dataclass
class CertificationEntry:
    name: str
    issuer: str | None = None
    date: str | None = None
    confidence: float = 0.8


class CertificationParser:
    def parse(self, lines: list[str]) -> list[CertificationEntry]:
        entries: list[CertificationEntry] = []
        for line in lines:
            stripped = line.strip()
            if not stripped:
                continue
            entries.append(self._parse_line(stripped))
        return entries

    def _parse_line(self, text: str) -> CertificationEntry:
        date: str | None = None
        issuer: str | None = None

        m = DATE_PATTERN.search(text)
        if m:
            date = f"{m.group(1)[:3].capitalize()} {m.group(2)}"

        for known in KNOWN_ISSUERS:
            if known.lower() in text.lower():
                issuer = known
                break

        # Name = text with date and issuer stripped (rough heuristic)
        name = text
        if date:
            name = name.replace(m.group(0), "").strip(" -–|,")  # type: ignore[union-attr]
        name = name.strip()

        confidence = 0.9 if (issuer and date) else (0.7 if (issuer or date) else 0.6)

        return CertificationEntry(name=name, issuer=issuer, date=date, confidence=confidence)
