from __future__ import annotations

import re
from collections import defaultdict
from typing import Literal

SectionType = Literal[
    "summary", "education", "experience", "projects",
    "skills", "certifications", "achievements", "unstructured"
]

HEADING_VOCAB: dict[str, SectionType] = {
    "education": "education",
    "academic background": "education",
    "academic qualifications": "education",
    "academic details": "education",
    "educational background": "education",
    "work experience": "experience",
    "professional experience": "experience",
    "experience": "experience",
    "employment": "experience",
    "employment history": "experience",
    "internship": "experience",
    "internships": "experience",
    "projects": "projects",
    "personal projects": "projects",
    "academic projects": "projects",
    "technical projects": "projects",
    "key projects": "projects",
    "technical skills": "skills",
    "skills": "skills",
    "technologies": "skills",
    "tech stack": "skills",
    "tools and technologies": "skills",
    "core competencies": "skills",
    "certifications": "certifications",
    "licenses": "certifications",
    "certificates": "certifications",
    "certifications and courses": "certifications",
    "courses": "certifications",
    "summary": "summary",
    "objective": "summary",
    "profile": "summary",
    "about": "summary",
    "about me": "summary",
    "career objective": "summary",
    "professional summary": "summary",
    # Achievements get their own section so token-level skill extraction runs on them
    "achievements": "achievements",
    "accomplishments": "achievements",
    "honors and awards": "achievements",
    "awards": "achievements",
    "extracurricular": "achievements",
    "activities": "achievements",
    "co-curricular": "achievements",
    "publications": "summary",
    "research": "summary",
    "languages": "summary",
}

_STRIP_PUNCT = re.compile(r"[^\w\s]")


def _normalize_heading(line: str) -> str:
    return _STRIP_PUNCT.sub("", line.lower()).strip()


class SectionDetector:
    def detect(self, text: str) -> dict[SectionType, list[str]]:
        sections: dict[str, list[str]] = defaultdict(list)
        current: SectionType = "summary"
        heading_seen = False
        prev_was_heading = False

        for line in text.split("\n"):
            stripped = line.strip()
            if not stripped:
                prev_was_heading = False
                continue

            section_type = self._match_heading(stripped)
            if section_type and not prev_was_heading:
                current = section_type
                heading_seen = True
                prev_was_heading = True
            else:
                sections[current].append(stripped)
                prev_was_heading = False

        if not heading_seen:
            all_lines = sections.get("summary", [])
            return {"unstructured": all_lines}

        return dict(sections)

    def _match_heading(self, line: str) -> SectionType | None:
        # Must be short and not end with sentence-terminating punctuation
        if len(line) > 60:
            return None
        if line.endswith((".", ",", ";")):
            return None
        normalized = _normalize_heading(line)
        return HEADING_VOCAB.get(normalized)
