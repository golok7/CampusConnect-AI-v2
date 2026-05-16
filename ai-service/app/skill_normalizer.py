from __future__ import annotations

import re
from typing import Any


class SkillNormalizer:
    def __init__(
        self,
        text_keywords: list[list[str]],
        skill_ontology: dict[str, list[dict[str, Any]]],
    ) -> None:
        # Split into multi-word (substring match) and single-word (boundary regex)
        self._multi: list[tuple[str, str]] = []
        self._single: list[tuple[str, str]] = []
        self._single_patterns: dict[str, re.Pattern] = {}

        for alias, display in text_keywords:
            if " " in alias:
                self._multi.append((alias, display))
            else:
                self._single.append((alias, display))
                self._single_patterns[alias] = re.compile(
                    rf"\b{re.escape(alias)}\b", re.IGNORECASE
                )

        # Build full alias → display and display → category maps from ontology
        self._alias_to_display: dict[str, str] = {}
        self._display_to_category: dict[str, str] = {}

        for category, skills in skill_ontology.items():
            for skill in skills:
                display = skill["display"]
                self._display_to_category[display] = category
                self._alias_to_display[display.lower()] = display
                for alias in skill.get("aliases", []):
                    self._alias_to_display[alias.lower()] = display

    # ── Public API ──────────────────────────────────────────────────────────────

    def extract_from_text(self, text: str) -> list[str]:
        """Return deduplicated Canonical_Display_Names found in free-form text."""
        lower = text.lower()
        found: set[str] = set()

        for alias, display in self._multi:
            if alias in lower:
                found.add(display)

        for alias, display in self._single:
            if self._single_patterns[alias].search(lower):
                found.add(display)

        return list(found)

    def extract_categorized(self, text: str) -> dict[str, list[str]]:
        """Return skills bucketed by category from free-form text."""
        displays = self.extract_from_text(text)
        return self._categorize(displays)

    def extract_from_tokens(self, tokens: list[str]) -> list[str]:
        """Exact-match individual tokens from a structured skills list."""
        found: set[str] = set()
        for token in tokens:
            display = self._alias_to_display.get(token.strip().lower())
            if display:
                found.add(display)
        return list(found)

    def categorize_display(self, display: str) -> str | None:
        return self._display_to_category.get(display)

    # Common English words that are not skills and frequently appear in resumes
    _STOPWORDS: frozenset[str] = frozenset({
        # Articles / prepositions / conjunctions
        "and", "the", "for", "with", "from", "this", "that", "have", "has",
        "are", "was", "were", "been", "being", "not", "but", "can", "will",
        "also", "all", "new", "use", "used", "using", "via", "per", "its",
        "our", "their", "your", "including", "based", "such", "into", "over",
        "out", "more", "one", "two", "three", "each", "both", "during",
        "across", "by", "of", "in", "on", "at", "to", "an", "as", "is",
        "it", "or", "be", "do", "up", "if", "no", "so", "we", "he", "she",
        # General job/resume words
        "high", "large", "key", "main", "core", "real", "time",
        "data", "model", "system", "service", "project", "team", "work",
        "build", "built", "develop", "developed", "design", "designed",
        "implement", "implemented", "deploy", "deployed", "manage", "managed",
        "create", "created", "lead", "led", "support", "improve", "improved",
        "reduce", "reduced", "increase", "increased", "enable", "enabled",
        "ensure", "help", "make", "test", "tested", "write", "written",
        "research", "intern", "internship", "engineering", "engineer",
        "student", "university", "college", "institute", "bachelor", "master",
        "cgpa", "gpa", "grade", "score", "present", "remote", "full",
        "part", "senior", "junior", "associate", "principal",
        # Resume section headings and sub-headings
        "experience", "education", "skills", "projects", "certifications",
        "achievements", "summary", "objective", "profile", "activities",
        "awards", "publications", "languages", "interests",
        "programming", "frameworks", "libraries", "tools", "databases",
        "technologies", "technical", "coursework", "courses", "areas",
        # Common technical verbs / adjectives not worth surfacing
        "distributed", "scalable", "automated", "integrated", "optimized",
        "training", "inference", "deployment", "pipeline", "pipelines",
        "evaluation", "recommendation", "optimization", "precision",
        "latency", "accuracy", "performance", "architecture", "workflow",
        "workflows", "serving", "ranking", "retrieval", "embedding",
        "embeddings", "similarity", "factorization", "matrix",
        # Months
        "january", "february", "march", "april", "may", "june",
        "july", "august", "september", "october", "november", "december",
        "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "oct",
        "nov", "dec",
        # Misc
        "india", "bangalore", "hyderabad", "delhi", "mumbai", "chennai",
        "pune", "kolkata", "among", "ranked", "solved", "across",
        "platform", "engine", "models", "model", "mixed",
    })

    # Patterns that disqualify a token regardless of stopwords
    _SKIP_PATTERNS: list[re.Pattern] = [
        re.compile(r"^\+?\d[\d\s\-().]+$"),          # phone numbers
        re.compile(r"^[a-z0-9_.+-]+$"),              # all-lowercase handles / hashes
        re.compile(r"^[A-Z]{2,}$"),                  # all-caps section words (EXPERIENCE, ML, etc.)
        re.compile(r"^\d[\d.x+%k\-]*$"),             # numbers / units
        re.compile(r"[-￿]"),               # ligature chars (ﬂ, ﬁ, etc.)
        re.compile(r"^[–—\-/\\|]+$"),                # pure punctuation
    ]

    def build_unknown_skills(self, text: str, cap: int = 30) -> list[str]:
        """Tokens not in ontology, for diagnostic use."""
        # Mask multi-word known skills before tokenising so fragments
        # ("Hugging", "Face", "Weights", "Biases") don't appear as unknowns.
        masked = text
        for alias, _display in self._multi:
            masked = re.sub(re.escape(alias), "_KNOWN_", masked, flags=re.IGNORECASE)
        tokens = re.split(r"[,|·•\n\t/()\[\]@& ]+", masked)
        seen: set[str] = set()
        unknown: list[str] = []

        for token in tokens:
            t = token.strip().strip(".-_:;")
            if not t or not (3 <= len(t) <= 30):
                continue
            tl = t.lower()
            if tl in seen:
                continue
            if tl in self._alias_to_display:
                continue
            if tl in self._STOPWORDS:
                continue
            # Skip emails, URLs
            if "@" in t or "http" in tl or "www." in tl or ".com" in tl:
                continue
            if any(p.search(t) for p in self._SKIP_PATTERNS):
                continue
            seen.add(tl)
            unknown.append(t)
            if len(unknown) >= cap:
                break
        return unknown

    def build_normalized_skills(self, skills: dict[str, list[str]]) -> list[str]:
        """Sorted lowercase deduplication of all skill display names."""
        return sorted({
            s.lower()
            for cat_skills in skills.values()
            for s in cat_skills
        })

    # ── Internal ────────────────────────────────────────────────────────────────

    def _categorize(self, displays: list[str]) -> dict[str, list[str]]:
        result: dict[str, list[str]] = {
            "languages": [], "frameworks": [], "libraries": [],
            "databases": [], "tools": [],
        }
        seen: set[str] = set()
        for display in displays:
            if display in seen:
                continue
            seen.add(display)
            cat = self._display_to_category.get(display)
            if cat and cat in result:
                result[cat].append(display)
        return result

    def merge_skills(
        self, base: dict[str, list[str]], extra: dict[str, list[str]]
    ) -> dict[str, list[str]]:
        """Union two categorized skill dicts (no deduplication loss)."""
        result: dict[str, list[str]] = {}
        for cat in ("languages", "frameworks", "libraries", "databases", "tools"):
            combined = set(base.get(cat, [])) | set(extra.get(cat, []))
            result[cat] = sorted(combined)
        return result
