from __future__ import annotations

SECTION_WEIGHTS: dict[str, float] = {
    "skills":       1.0,
    "projects":     0.8,
    "experience":   0.6,
    "education":    0.4,
    "summary":      0.3,
    "certifications": 0.3,
    "unstructured": 0.5,
}

DOMAIN_LIST = [
    "frontend", "backend", "devops", "database", "systems",
    "ai_ml", "genai", "agentic_ai", "mlops", "data_science",
    "algorithms", "cybersecurity", "blockchain", "embedded",
    "networking", "distributed_systems",
]

_DOMAIN_CONFIDENCE_NORMALIZER = 20


class DomainInferrer:
    def __init__(
        self,
        domain_rules: dict[str, list[str]],
        overlap_dampening: dict[str, dict[str, float]],
    ) -> None:
        self._rules = domain_rules
        self._dampening = overlap_dampening

    def infer(self, sections: dict[str, list[str]]) -> dict[str, int]:
        # Step 1 — raw score accumulation
        raw: dict[str, float] = {d: 0.0 for d in DOMAIN_LIST}
        total_hits = 0

        for section_name, lines in sections.items():
            weight = SECTION_WEIGHTS.get(section_name, 0.3)
            section_text = " ".join(lines).lower()
            for domain in DOMAIN_LIST:
                keywords = self._rules.get(domain, [])
                hits = sum(1 for kw in keywords if kw in section_text)
                raw[domain] += hits * weight
                total_hits += hits

        # Step 2 — normalize to [0, 100]
        max_raw = max(raw.values(), default=1) or 1
        normalized: dict[str, float] = {
            d: (s / max_raw) * 100 for d, s in raw.items()
        }

        # Step 3 — apply overlap dampening
        for primary, neighbors in self._dampening.items():
            primary_score = normalized.get(primary, 0)
            for neighbor, factor in neighbors.items():
                neighbor_score = normalized.get(neighbor, 0)
                if primary_score > neighbor_score:
                    normalized[neighbor] = neighbor_score * factor

        # Step 4 — clamp to [0, 100] as integers
        scores: dict[str, int] = {
            d: max(0, min(100, round(normalized.get(d, 0))))
            for d in DOMAIN_LIST
        }

        return scores

    def top_domains(self, scores: dict[str, int], n: int = 5) -> list[dict]:
        return sorted(
            [{"domain": d, "score": s} for d, s in scores.items() if s > 0],
            key=lambda x: -x["score"],
        )[:n]

    def domain_confidence(self, total_hits: int) -> float:
        return min(total_hits / _DOMAIN_CONFIDENCE_NORMALIZER, 1.0)
