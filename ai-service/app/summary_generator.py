from __future__ import annotations

DOMAIN_LABELS: dict[str, str] = {
    "frontend": "Frontend Development",
    "backend": "Backend Development",
    "devops": "DevOps & Cloud",
    "database": "Database Engineering",
    "systems": "Systems Programming",
    "ai_ml": "Machine Learning",
    "genai": "Generative AI",
    "agentic_ai": "Agentic AI",
    "mlops": "MLOps",
    "data_science": "Data Science",
    "algorithms": "Algorithms & DSA",
    "cybersecurity": "Cybersecurity",
    "blockchain": "Blockchain",
    "embedded": "Embedded Systems",
    "networking": "Networking",
    "distributed_systems": "Distributed Systems",
}


class SummaryGenerator:
    def generate(
        self,
        education: list,
        top_domains: list[dict],
        skills: dict[str, list[str]],
        openai_key: str | None = None,
    ) -> tuple[str, str]:
        template = self._build_template(education, top_domains, skills)

        if not openai_key:
            return template, "template"

        try:
            llm = self._call_openai(education, top_domains, skills, openai_key)
            return llm, "llm"
        except Exception:
            return template, "template"

    def _build_template(
        self,
        education: list,
        top_domains: list[dict],
        skills: dict[str, list[str]],
    ) -> str:
        parts: list[str] = []

        # Sentence 1 — education
        if education:
            edu = education[0]
            degree = getattr(edu, "degree", None) or "Student"
            institution = getattr(edu, "institution", None) or "university"
            year = getattr(edu, "graduation_year", None)
            year_str = f" (Class of {year})" if year else ""
            parts.append(f"{degree} student at {institution}{year_str}.")

        # Sentence 2 — top 2 domains
        if top_domains:
            domain_names = [DOMAIN_LABELS.get(d["domain"], d["domain"]) for d in top_domains[:2]]
            parts.append(f"Strong background in {' and '.join(domain_names)}.")

        # Sentence 3 — top 5 skills
        all_skills = [
            s for cat in ("languages", "frameworks", "libraries", "databases", "tools")
            for s in skills.get(cat, [])
        ][:5]
        if all_skills:
            parts.append(f"Proficient in {', '.join(all_skills)}.")

        return " ".join(parts) if parts else "Candidate profile extracted from resume."

    def _call_openai(
        self,
        education: list,
        top_domains: list[dict],
        skills: dict[str, list[str]],
        openai_key: str,
    ) -> str:
        import httpx

        all_skills = [
            s for cat in ("languages", "frameworks", "libraries", "databases", "tools")
            for s in skills.get(cat, [])
        ][:8]

        prompt = (
            f"Write a 2-3 sentence professional summary for a candidate with these details:\n"
            f"Education: {getattr(education[0], 'institution', 'N/A') if education else 'N/A'}\n"
            f"Top domains: {', '.join(d['domain'] for d in top_domains[:3])}\n"
            f"Skills: {', '.join(all_skills)}\n"
            "Be concise and factual. Do not invent details."
        )

        response = httpx.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {openai_key}"},
            json={
                "model": "gpt-3.5-turbo",
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 120,
            },
            timeout=5.0,
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"].strip()
