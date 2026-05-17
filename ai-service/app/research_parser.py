from __future__ import annotations

import re
from dataclasses import dataclass, field

# Matches a 4-digit year between 1990 and 2030
_YEAR_RE = re.compile(r"\b(199\d|20[012]\d)\b")
# Text inside quotes — paper titles are often quoted
_QUOTED_RE = re.compile(r'["“”](.*?)["“”]')
# Conference/journal venue keywords
_VENUE_KEYWORDS = re.compile(
    r"\b(proceedings|conference|workshop|symposium|journal|transactions|"
    r"IEEE|ACM|ICML|NeurIPS|ICLR|CVPR|ECCV|ICCV|EMNLP|ACL|NAACL|SIGKDD|"
    r"SOSP|OSDI|SIGCOMM|USENIX|CCS|NDSS|AAAI|IJCAI|arxiv|preprint)\b",
    re.IGNORECASE,
)

# Domain keyword sets for title-based domain inference (lightweight, no external deps)
_DOMAIN_HINTS: dict[str, list[str]] = {
    "ai_ml":              ["machine learning", "neural network", "classification", "regression",
                           "deep learning", "reinforcement", "supervised", "unsupervised", "gradient"],
    "genai":              ["generative", "diffusion", "gan", "large language", "llm", "gpt",
                           "text generation", "image generation", "language model"],
    "data_science":       ["data analysis", "statistical", "prediction", "forecasting",
                           "feature selection", "data mining", "clustering", "anomaly"],
    "nlp":                ["natural language", "sentiment", "text classification", "named entity",
                           "machine translation", "question answering", "summarization"],
    "cybersecurity":      ["security", "intrusion", "malware", "vulnerability", "attack",
                           "cryptography", "privacy", "authentication", "threat"],
    "algorithms":         ["algorithm", "complexity", "optimization", "graph", "sorting",
                           "dynamic programming", "approximation", "combinatorial"],
    "networking":         ["network", "protocol", "routing", "wireless", "iot", "tcp",
                           "latency", "bandwidth", "packet", "5g"],
    "distributed_systems":["distributed", "consensus", "fault tolerance", "replication",
                           "blockchain", "peer-to-peer", "cloud computing", "microservices"],
    "systems":            ["operating system", "kernel", "memory", "cache", "compiler",
                           "parallel", "concurrency", "hardware", "embedded"],
    "computer_vision":    ["image recognition", "object detection", "segmentation",
                           "visual", "convolutional", "feature extraction", "tracking"],
}


def _infer_domains(text: str) -> list[str]:
    lower = text.lower()
    hits: list[tuple[str, int]] = []
    for domain, keywords in _DOMAIN_HINTS.items():
        count = sum(1 for kw in keywords if kw in lower)
        if count > 0:
            hits.append((domain, count))
    hits.sort(key=lambda x: -x[1])
    return [d for d, _ in hits[:3]]


@dataclass
class ResearchEntry:
    title:      str
    venue:      str | None      = None
    year:       int | None      = None
    authors:    list[str]       = field(default_factory=list)
    domains:    list[str]       = field(default_factory=list)
    raw:        str             = ""
    confidence: float           = 0.5


def _extract_year(text: str) -> int | None:
    m = _YEAR_RE.search(text)
    return int(m.group(1)) if m else None


def _extract_title(line: str) -> str | None:
    # First try: quoted text
    m = _QUOTED_RE.search(line)
    if m and len(m.group(1)) > 10:
        return m.group(1).strip().rstrip(".,;")

    # Second try: strip leading author-like prefixes (Author, A., Author, B.)
    # Author patterns: "Lastname, F." or "F. Lastname"
    author_prefix = re.match(
        r"^(?:[A-Z][a-z]+(?:,\s+[A-Z]\.)?(?:,\s+)?(?:and\s+)?){1,4}[.,]?\s*",
        line
    )
    if author_prefix:
        remainder = line[author_prefix.end():].strip()
        if len(remainder) > 15:
            return remainder.rstrip(".,;")

    # Third try: just use the whole line if it looks substantive
    clean = line.strip().rstrip(".,;")
    if len(clean) > 15 and not _YEAR_RE.fullmatch(clean):
        return clean

    return None


def _extract_venue(line: str) -> str | None:
    m = _VENUE_KEYWORDS.search(line)
    if not m:
        return None
    # Return the surrounding phrase (up to 60 chars from the match)
    start = max(0, m.start() - 5)
    end   = min(len(line), m.end() + 40)
    return line[start:end].strip().rstrip(".,;")


def _looks_like_paper_line(line: str) -> bool:
    if len(line) < 15:
        return False
    # Must contain at least one of: year, venue keyword, quoted text, doi-like pattern
    has_year   = bool(_YEAR_RE.search(line))
    has_venue  = bool(_VENUE_KEYWORDS.search(line))
    has_quote  = bool(_QUOTED_RE.search(line))
    has_doi    = "doi" in line.lower() or "arxiv" in line.lower()
    return has_year or has_venue or has_quote or has_doi


class ResearchParser:
    def parse(self, lines: list[str]) -> list[ResearchEntry]:
        entries: list[ResearchEntry] = []
        buffer: list[str] = []

        def flush():
            if not buffer:
                return
            raw = " ".join(buffer)
            if _looks_like_paper_line(raw):
                entries.append(self._parse_entry(raw))
            buffer.clear()

        for line in lines:
            stripped = line.strip()
            if not stripped:
                flush()
                continue

            # A new entry usually starts with a number, bullet, dash, or capital letter
            if re.match(r"^(?:\d+[.)]\s|\[?\d+\]?\s|[-•*]\s|[A-Z])", stripped) and buffer:
                flush()

            buffer.append(stripped)

        flush()
        return entries

    def _parse_entry(self, raw: str) -> ResearchEntry:
        # Strip leading index: "1. ", "[1] ", "• ", "- "
        text = re.sub(r"^(?:\[?\d+\]?[.)]\s+|[-•*]\s+)", "", raw).strip()

        year    = _extract_year(text)
        venue   = _extract_venue(text)
        title   = _extract_title(text)
        domains = _infer_domains(text)

        # Confidence: higher if we found both title and year
        confidence = 0.4
        if title:  confidence += 0.3
        if year:   confidence += 0.2
        if venue:  confidence += 0.1

        return ResearchEntry(
            title      = title or text[:120],
            venue      = venue,
            year       = year,
            authors    = [],
            domains    = domains,
            raw        = raw[:300],
            confidence = round(confidence, 2),
        )
