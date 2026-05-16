from __future__ import annotations

import re
from dataclasses import dataclass, field

URL_PATTERN = re.compile(
    r"https?://[^\s)>\"']+|github\.com/[^\s)>\"']+",
    re.IGNORECASE,
)

BULLET_CHARS = {"•", "-", "*", "–", "▪", "◦"}

# Patterns that disqualify a line from being a project name
_DATE_RE = re.compile(
    r"\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}\b",
    re.IGNORECASE,
)
_MOSTLY_NUMBERS = re.compile(r"^[\d\s/–\-,\.%|()]+$")
# Lines ending with a bare link indicator: last word of a bullet continuation
_LINK_TAIL_RE = re.compile(
    r"\b(?:GitHub|GitLab|Bitbucket|Demo|Source|Live|Link)\s*$",
    re.IGNORECASE,
)


def _is_bullet(line: str) -> bool:
    s = line.strip()
    return bool(s) and s[0] in BULLET_CHARS


def _looks_like_project_header(line: str) -> bool:
    """Short non-bullet line that looks like a project name."""
    s = line.strip()
    if not s or len(s) < 5 or len(s) > 100:
        return False
    if s[0] in BULLET_CHARS:
        return False
    # Continuation lines: lowercase start or digit start → not a project title
    if s[0].islower() or s[0].isdigit():
        return False
    # Sentence fragments end with terminal punctuation — not a project title
    if s.endswith((".", ",", ";")):
        return False
    if _DATE_RE.search(s) or _MOSTLY_NUMBERS.match(s):
        return False
    if _LINK_TAIL_RE.search(s):
        return False
    # Should have at least one capitalised word
    words = s.split()
    return any(w and w[0].isupper() for w in words)


@dataclass
class ProjectEntry:
    name: str
    description: str
    tech_stack: list[str] = field(default_factory=list)
    links: list[str] = field(default_factory=list)
    confidence: float = 0.8


class ProjectParser:
    def parse(self, lines: list[str], skill_normalizer=None) -> list[ProjectEntry]:
        blocks = self._split_blocks(lines)
        return [self._parse_block(b, skill_normalizer) for b in blocks if b]

    def _parse_block(self, block: list[str], skill_normalizer) -> ProjectEntry:
        text = " ".join(block)
        links = URL_PATTERN.findall(text)

        # Project name = consecutive non-bullet lines at the start of the block.
        # If the first line doesn't end with sentence-terminal punctuation the title
        # may span two lines (e.g. "Adaptive Traffic Flow Prediction using\nGraph Neural Networks").
        name_parts: list[str] = []
        for l in block:
            s = l.strip()
            if not s or _is_bullet(s):
                break
            while s and s[0] in BULLET_CHARS:
                s = s[1:].strip()
            if not s:
                break
            # Skip bullet-tail lines that end with a bare "GitHub", "Demo", etc.
            # e.g. "FastAPI backend. GitHub" is the tail of the previous project.
            if _LINK_TAIL_RE.search(s):
                continue
            name_parts.append(s)
            # Stop after first line if it ends with punctuation (complete title)
            # or after second line at most (avoid swallowing bullets text into name)
            if s.endswith((".", ",", ":", ";", "!")) or len(name_parts) >= 2:
                break
        name_line = " ".join(name_parts) if name_parts else ""

        name_line = name_line or "Unnamed Project"
        description = text[:500]
        confidence = 0.8 if name_line != "Unnamed Project" else 0.5

        tech_stack: list[str] = []
        if skill_normalizer:
            tech_stack = skill_normalizer.extract_from_text(text)

        return ProjectEntry(
            name=name_line,
            description=description,
            tech_stack=tech_stack,
            links=links,
            confidence=confidence,
        )

    def _split_blocks(self, lines: list[str]) -> list[list[str]]:
        """
        Split on blank lines; also start a new block when a project-header line
        appears after the first line (handles resumes without blank separators).
        """
        blocks: list[list[str]] = []
        current: list[str] = []
        first_in_block = True  # first non-blank line of the current block

        for line in lines:
            stripped = line.strip()

            if not stripped:
                if current:
                    blocks.append(current)
                    current = []
                    first_in_block = True
                continue

            # After the header of the current block, a new header line = new project
            if not first_in_block and _looks_like_project_header(stripped):
                # Only split if we have some content already (at least a header + 1 more line)
                if len(current) >= 2:
                    blocks.append(current)
                    current = [line]
                    first_in_block = False  # this new line IS the header
                    continue

            current.append(line)
            if first_in_block and stripped:
                first_in_block = False

        if current:
            blocks.append(current)

        return blocks or [lines]
