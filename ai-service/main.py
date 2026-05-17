from __future__ import annotations

import logging
import os
import uuid
from contextlib import asynccontextmanager
from typing import Any

import httpx
from fastapi import FastAPI, Request, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.cert_parser import CertificationParser
from app.confidence_scorer import ConfidenceScorer
from app.domain_inferrer import DOMAIN_LIST, DomainInferrer
from app.education_parser import EducationParser
from app.experience_parser import ExperienceParser
from app.extractors import TextExtractor
from app.normalizer import normalize_text
from app.ontology_snapshot import (
    BUNDLED_DOMAIN_RULES,
    BUNDLED_OVERLAP_DAMPENING,
    BUNDLED_SKILL_ONTOLOGY,
    BUNDLED_TEXT_KEYWORDS,
)
from app.project_parser import ProjectParser
from app.section_detector import SectionDetector
from app.skill_normalizer import SkillNormalizer
from app.summary_generator import SummaryGenerator
from app.validators import FileValidator

logger = logging.getLogger("resume-parser")
logging.basicConfig(level=logging.INFO)

NODE_BACKEND_URL = os.getenv("NODE_BACKEND_URL", "http://localhost:5000")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Module-level singletons populated at startup
_text_keywords: list[list[str]] = []
_skill_ontology: dict[str, Any] = {}
_domain_rules: dict[str, list[str]] = {}
_overlap_dampening: dict[str, dict[str, float]] = {}


async def _fetch_ontology() -> None:
    global _text_keywords, _skill_ontology, _domain_rules, _overlap_dampening
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            kw_resp = await client.get(f"{NODE_BACKEND_URL}/api/ontology/keywords")
            dm_resp = await client.get(f"{NODE_BACKEND_URL}/api/ontology/domains")
            sk_resp = await client.get(f"{NODE_BACKEND_URL}/api/ontology/skills")
            kw_resp.raise_for_status()
            dm_resp.raise_for_status()
            sk_resp.raise_for_status()
            _text_keywords = kw_resp.json()
            _domain_rules = dm_resp.json()
            _skill_ontology = sk_resp.json()
            _overlap_dampening = BUNDLED_OVERLAP_DAMPENING  # not exposed via API, use snapshot
            logger.info("Ontology loaded from Node backend")
    except Exception as exc:
        logger.warning(f"Could not fetch ontology from Node backend: {exc}. Using bundled snapshot.")
        _text_keywords = BUNDLED_TEXT_KEYWORDS
        _skill_ontology = BUNDLED_SKILL_ONTOLOGY
        _domain_rules = BUNDLED_DOMAIN_RULES
        _overlap_dampening = BUNDLED_OVERLAP_DAMPENING


@asynccontextmanager
async def lifespan(app: FastAPI):
    await _fetch_ontology()
    yield


app = FastAPI(title="CampusConnect Resume Intelligence", lifespan=lifespan)


# ── Pydantic response models ──────────────────────────────────────────────────

class SkillsObject(BaseModel):
    languages: list[str] = []
    frameworks: list[str] = []
    libraries: list[str] = []
    databases: list[str] = []
    tools: list[str] = []


class EducationOut(BaseModel):
    institution: str
    degree: str | None = None
    branch: str | None = None
    graduationYear: int | None = None
    cgpa: float | None = None
    confidence: float
    rawText: str | None = None


class ExperienceOut(BaseModel):
    company: str | None = None
    role: str | None = None
    startDate: str | None = None
    endDate: str | None = None
    durationMonths: int | None = None
    bullets: list[str] = []
    confidence: float


class ProjectOut(BaseModel):
    name: str
    description: str
    techStack: list[str] = []
    links: list[str] = []
    confidence: float


class CertificationOut(BaseModel):
    name: str
    issuer: str | None = None
    date: str | None = None
    confidence: float


class TopDomainEntry(BaseModel):
    domain: str
    score: int


class ConfidenceObject(BaseModel):
    skills: float
    education: float
    experience: float
    projects: float
    certifications: float
    domainScores: float
    summary: float
    overallConfidence: float


class ParseResponse(BaseModel):
    skills: SkillsObject
    normalizedSkills: list[str]
    domainScores: dict[str, int]
    topDomains: list[TopDomainEntry]
    education: list[EducationOut]
    experience: list[ExperienceOut]
    projects: list[ProjectOut]
    certifications: list[CertificationOut]
    summary: str
    summarySource: str
    confidence: ConfidenceObject
    unknownSkills: list[str]
    warnings: list[str]


# ── Global exception handler ──────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    request_id = str(uuid.uuid4())
    logger.exception(f"Unhandled exception [requestId={request_id}]", exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal parsing error", "requestId": request_id},
    )


# ── Health check ──────────────────────────────────────────────────────────────

@app.get("/")
async def health():
    return {"status": "resume-intelligence running"}


# ── Main parse endpoint ───────────────────────────────────────────────────────

@app.post("/resume/parse", response_model=ParseResponse)
async def parse_resume(file: UploadFile):
    file_bytes = await file.read()
    content_type = file.content_type or ""

    # Validate
    validator = FileValidator()
    validator.validate(content_type, len(file_bytes))

    # Extract text
    extractor = TextExtractor()
    extracted = extractor.extract(file_bytes, content_type)
    warnings = extracted.warnings[:]

    # Normalize
    normalized_text = normalize_text(extracted.text)

    # Detect sections
    detector = SectionDetector()
    sections = detector.detect(normalized_text)

    if "unstructured" in sections:
        warnings.append("No section headings detected; full-text extraction used")

    # Build skill normalizer
    skill_norm = SkillNormalizer(_text_keywords, _skill_ontology)

    # Extract skills from all sections
    all_section_text = normalized_text
    categorized = skill_norm.extract_categorized(all_section_text)

    # Structured skills section gets token-level exact matching too
    if "skills" in sections:
        import re
        skills_text = " ".join(sections["skills"])
        tokens = re.split(r"[,|·•/\n\t\[\]()\s]+", skills_text)
        structured_skills = skill_norm.extract_from_tokens(tokens)
        for display in structured_skills:
            cat = skill_norm.categorize_display(display)
            if cat and cat in categorized:
                if display not in categorized[cat]:
                    categorized[cat].append(display)

    # Add skills from project sections
    if "projects" in sections:
        proj_text = " ".join(sections["projects"])
        proj_skills = skill_norm.extract_from_text(proj_text)
        categorized = skill_norm.merge_skills(
            categorized,
            skill_norm._categorize(proj_skills),
        )

    # Achievements section: token-level + text extraction (same as skills section)
    if "achievements" in sections:
        import re as _re
        ach_text = " ".join(sections["achievements"])
        ach_tokens = _re.split(r"[,|·•/\n\t\[\]()\s]+", ach_text)
        ach_token_skills = skill_norm.extract_from_tokens(ach_tokens)
        for display in ach_token_skills:
            cat = skill_norm.categorize_display(display)
            if cat and cat in categorized:
                if display not in categorized[cat]:
                    categorized[cat].append(display)
        # Also run text keyword matching on achievements
        ach_text_skills = skill_norm.extract_from_text(ach_text)
        categorized = skill_norm.merge_skills(
            categorized,
            skill_norm._categorize(ach_text_skills),
        )

    normalized_skills = skill_norm.build_normalized_skills(categorized)
    # Scope unknown-skill detection to the skills section only.
    # Running it against the full text surfaces project/education words, not unlisted skills.
    skills_section_text = " ".join(sections.get("skills", []))
    unknown_skills = skill_norm.build_unknown_skills(skills_section_text) if skills_section_text else []

    # Parse education
    edu_parser = EducationParser()
    edu_entries = edu_parser.parse(sections.get("education", []))

    # Parse experience
    exp_parser = ExperienceParser()
    exp_entries = exp_parser.parse(sections.get("experience", []))

    # Parse projects
    proj_parser = ProjectParser()
    proj_entries = proj_parser.parse(sections.get("projects", []), skill_norm)

    # Parse certifications
    cert_parser = CertificationParser()
    cert_entries = cert_parser.parse(sections.get("certifications", []))

    # Domain inference
    inferrer = DomainInferrer(_domain_rules, _overlap_dampening)
    domain_scores = inferrer.infer(sections)
    top_domains = inferrer.top_domains(domain_scores)

    # Confidence scoring
    scorer = ConfidenceScorer()
    total_tokens = len([
        t for t in all_section_text.split() if 2 <= len(t) <= 35
    ])
    total_matched = sum(len(v) for v in categorized.values())

    section_confidences: dict[str, float] = {
        "skills":        scorer.score_skills(total_matched, max(total_tokens, 1)),
        "education":     scorer.score_section(
            sum(1 for e in edu_entries if e.confidence >= 0.7), max(len(edu_entries), 1)
        ),
        "experience":    scorer.score_section(
            sum(1 for e in exp_entries if e.confidence >= 0.7), max(len(exp_entries), 1)
        ),
        "projects":      scorer.score_section(
            sum(1 for e in proj_entries if e.confidence >= 0.7), max(len(proj_entries), 1)
        ),
        "certifications": scorer.score_section(
            sum(1 for e in cert_entries if e.confidence >= 0.7), max(len(cert_entries), 1)
        ),
        "domainScores":  scorer.score_domain(
            sum(sum(1 for kw in kws if kw in all_section_text.lower())
                for kws in _domain_rules.values())
        ),
        "summary":       0.7,
    }

    # Summary
    summary_gen = SummaryGenerator()
    summary_text, summary_source = summary_gen.generate(
        edu_entries, top_domains, categorized, OPENAI_API_KEY
    )
    section_confidences["summary"] = 0.9 if summary_source == "llm" else 0.7
    overall = scorer.overall(section_confidences)

    # Serialize
    return ParseResponse(
        skills=SkillsObject(**categorized),
        normalizedSkills=normalized_skills,
        domainScores={d: domain_scores.get(d, 0) for d in DOMAIN_LIST},
        topDomains=[TopDomainEntry(**td) for td in top_domains],
        education=[EducationOut(
            institution=e.institution,
            degree=e.degree,
            branch=e.branch,
            graduationYear=e.graduation_year,
            cgpa=e.cgpa,
            confidence=e.confidence,
            rawText=e.raw_text,
        ) for e in edu_entries],
        experience=[ExperienceOut(
            company=e.company,
            role=e.role,
            startDate=e.start_date,
            endDate=e.end_date,
            durationMonths=e.duration_months,
            bullets=e.bullets,
            confidence=e.confidence,
        ) for e in exp_entries],
        projects=[ProjectOut(
            name=e.name,
            description=e.description,
            techStack=e.tech_stack,
            links=e.links,
            confidence=e.confidence,
        ) for e in proj_entries],
        certifications=[CertificationOut(
            name=e.name,
            issuer=e.issuer,
            date=e.date,
            confidence=e.confidence,
        ) for e in cert_entries],
        summary=summary_text,
        summarySource=summary_source,
        confidence=ConfidenceObject(
            skills=section_confidences["skills"],
            education=section_confidences["education"],
            experience=section_confidences["experience"],
            projects=section_confidences["projects"],
            certifications=section_confidences["certifications"],
            domainScores=section_confidences["domainScores"],
            summary=section_confidences["summary"],
            overallConfidence=overall,
        ),
        unknownSkills=unknown_skills,
        warnings=warnings,
    )
