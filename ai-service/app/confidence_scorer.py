from __future__ import annotations


class ConfidenceScorer:
    def score_skills(self, matched: int, total_candidates: int) -> float:
        if total_candidates == 0:
            return 0.0
        return min(matched / total_candidates, 1.0)

    def score_section(self, fully_parsed: int, total_entries: int) -> float:
        if total_entries == 0:
            return 0.0
        return fully_parsed / total_entries

    def score_domain(self, total_keyword_hits: int) -> float:
        return min(total_keyword_hits / 20, 1.0)

    def overall(self, section_scores: dict[str, float]) -> float:
        if not section_scores:
            return 0.0
        return round(sum(section_scores.values()) / len(section_scores), 3)
