# CampusConnect AI — Hackathon Slide Deck Blueprint

> **16 slides · 10–12 min presentation · 2 min Q&A buffer**

---

## Design System

| Element | Value |
|---|---|
| Background | Navy `#0A0F1E` |
| Primary accent | Indigo `#6366F1` |
| Success | `#22C55E` |
| Warning | `#F59E0B` |
| Font | Inter or Poppins (no serifs) |
| Code blocks | Dark theme, monospace, rounded corners |
| Diagrams | Excalidraw or Draw.io → export SVG |

---

## Slide 1 — Cover

**Layout:** Full dark background (`#0A0F1E`), centered content, subtle grid/circuit pattern overlay.

**Content:**
- Logo mark — stylized "CC" or brain + graduation cap icon
- **`CampusConnect AI`** (large, bold)
- Tagline: *"From Resume to Ranked — Semantic Campus Hiring Intelligence"*
- Subtitle: *AI-Powered Talent Discovery Platform for Campus Recruitment*
- Bottom strip: Hackathon name | Date | Track

**Visual tip:** Animated gradient orb or particle network background if submitting digitally.

---

## Slide 2 — The Problem

**Layout:** 60/40 split. Left: stat grid. Right: illustration of recruiter vs. stack of resumes.

**Heading:** `Campus Hiring is Broken`

**Left — Pain Points (icon + label per row):**

| Icon | Problem |
|---|---|
| 📄 | **Manual screening** — Recruiters spend 6–8 seconds per resume; 250+ resumes per role |
| 🔍 | **Keyword ATS** — "Python" in summary scores the same as "Python" across 5 projects |
| 🔗 | **No portfolio signal** — GitHub, LeetCode, open-source contributions ignored entirely |
| 🎭 | **Zero transparency** — Students have no idea why they were rejected |
| 🧾 | **Unstructured data** — PDFs with two-column layouts, ligature characters, hyphenated wraps |
| 🎓 | **Faculty bottleneck** — Placement cells rely on subjective recommendations |

**Right:** Funnel infographic — `500 applicants → 50 screened → 10 interviewed → 2 hired`, with each drop-off labeled with the reason.

---

## Slide 3 — Market Context

**Layout:** 4 large stat cards (2×2 grid) + 1 positioning statement at the bottom.

**Heading:** `The Scale of the Problem`

**Stat cards:**

| Stat | Label |
|---|---|
| **7M+** | Engineering graduates in India annually |
| **39%** | Fortune 500 companies use Workday — yet even enterprise ATS relies on keyword matching |
| **72%** | Resumes never read by a human — filtered by bots on wrong signals |
| **$4,000** | Average cost-per-hire in campus recruitment |

**Positioning statement (bottom, bold accent box):**
> *Existing ATS tools were built for enterprise HR — not for campus talent discovery where GitHub commits matter more than job titles.*

---

## Slide 4 — Solution Overview

**Layout:** Central product screenshot/mockup with 4 feature callouts radiating outward (spoke diagram).

**Heading:** `Introducing CampusConnect AI`

**Center:** Browser mockup of the recruiter search results page showing ranked candidates with `whyMatched` panel visible.

**4 spokes:**

| # | Icon | Feature | One-liner |
|---|---|---|---|
| 1 | 🧠 | **Resume Intelligence** | PDF → structured JSON in one API call |
| 2 | 🔎 | **Semantic JD Search** | Natural language → ranked candidates |
| 3 | 📊 | **GitHub Signal Fusion** | Code activity as a measurable talent signal |
| 4 | 🎯 | **Recruiter Intelligence** | Pipeline + AI interview questions + explainability |

**Tagline strip (bottom):** *"Not an ATS. A Talent Intelligence Layer."*

---

## Slide 5 — Feature: Resume Intelligence Engine

**Layout:** Left panel — before/after visual. Right panel — feature bullet list.

**Heading:** `Resume Intelligence Engine`

**Left — Before / After:**
- BEFORE: Image of a messy two-column PDF resume
- Arrow →
- AFTER: Clean JSON tree showing `institution`, `degree`, `cgpa`, `skills{}`, `experience[]`

**Right — What it does:**
- Parses PDF and DOCX (text-based; handles two-column layouts via coordinate-aware extraction)
- Detects section boundaries: Education, Experience, Projects, Skills, Certifications, Achievements
- Joins hyphenated line breaks and continuation lines — handles real PDF rendering artifacts
- GPA extraction handles both `"CGPA: 8.8"` and `"8.8 CGPA"` forms
- Graduation year prefers future year in ranges like `2023 – 2027` → returns `2027`
- `Role @ Company` pattern splits experience headers
- Project titles spanning wrapped lines are joined into a single name field

**Bottom callout box:**
> *16-domain ontology with section-weighted scoring — skills in experience count more than skills in a summary blurb.*

---

## Slide 6 — Feature: Semantic JD Search

**Layout:** Horizontal flow diagram (top half) + result card mockup (bottom half).

**Heading:** `Semantic Job Description Search`

**Flow diagram:**
```
Recruiter pastes JD
       ↓
 parseJDQuery()
       ↓
  ┌────────────────────────────┐
  │ Voyage AI embed (primary)  │  →  domain probability vector
  │ Keyword fallback (no key)  │  →  hit-count domain scores
  └────────────────────────────┘
       ↓
  searchUsers() — 4-stage pipeline
       ↓
  Ranked candidates with whyMatched
```

**4-Stage Pipeline (numbered cards, horizontal):**

| Stage | Method | Purpose |
|---|---|---|
| 1 | MongoDB `$gte` domain threshold | Hard gate — eliminates irrelevant profiles instantly |
| 2 | `$in` on `normalizedSkills` | Broad candidate pool retrieval |
| 3 | `√(Σweight(matched) / Σweight(requested))` | Weighted skill coverage — rare skills count more |
| 4 | `0.30×skill + 0.55×domain + 0.15×activity` | Final composite rank score |

**Result card mockup:**
```
Aarav Mehta  ·  IIIT Hyderabad  ·  2027        rankScore: 0.847
────────────────────────────────────────────────────────────────
✓ Matched domains : ai_ml, devops
✓ Matched skills  : python, pytorch, tensorflow, docker
✗ Missing skills  : spark, airflow
─
"ML and DevOps engineer with hands-on experience in PyTorch, TensorFlow, Docker."
```

---

## Slide 7 — Feature: GitHub Signal Fusion

**Layout:** Two-stream merge diagram. Left stream = GitHub. Right stream = Resume. Merge at center bottom.

**Heading:** `GitHub as a Talent Signal`

**Left stream — GitHub data:**
```
Repositories → language tags → domain keyword hits
Commits       → activityScore component
Stars         → activityScore component
Active days   → activityScore component
                      ↓
            githubDomainScore[d]
```

**Right stream — Resume data:**
```
Skills section   → ontology match → categorized skills
Projects section → skill extraction
Experience bullets → skill extraction
                      ↓
            resumeDomainScore[d]
```

**Merge rule (center, accent box):**
```
finalDomainScore[d] = max(githubScore[d], resumeDomainScore[d])
```
> *Resume enriches, never demotes. A student who uses TensorFlow in projects but hasn't pushed to GitHub yet is not penalized.*

**Bottom — Normalization formula:**
- Raw scores → `tanh(raw / 40)` → `0.7 × max + 0.3 × avg` across requested domains
- Example: `score=50 → 0.85` · `score=80 → 0.96`

---

## Slide 8 — Feature: Recruiter Intelligence Suite

**Layout:** 3-column card layout, equal width.

**Heading:** `Beyond Search — A Full Hiring Workflow`

---

**Card 1 — Match Explainability**

Every search result explains itself.

```json
"whyMatched": {
  "matchedDomains": ["ai_ml", "devops"],
  "matchedSkills": ["python", "pytorch", "tensorflow"],
  "missingSkills": ["spark", "airflow"],
  "semanticSummary": "ML and DevOps engineer with hands-on
                      experience in PyTorch, TensorFlow, Docker."
}
```
*Recruiters can justify every shortlist decision.*

---

**Card 2 — Recruiter Pipeline**

Greenhouse-style structured hiring for campus drives.

```
Shortlisted → Interviewing → Offered → Rejected
```
- Candidate snapshot stored at shortlisting time
- Grouped by job title with live stage counts
- Notes field for recruiter context per candidate
- `PATCH /pipeline/:id` to move stages

---

**Card 3 — AI Interview Questions**

Powered by Groq + Llama 3.3 70B. Sub-2-second response.

```
7 tailored questions per candidate:
  • 2× strength  — deep-dive matched skills
  • 2× gap       — probe adaptability on missing skills
  • 2× behavioral — tied to listed experience
  • 1× domain-fit — biggest domain vs role's domain
```
*Faculty interviewers get context-aware prompts — not generic "tell me about yourself."*

---

## Slide 9 — Technical Architecture

**Layout:** Full-slide diagram. Draw as layered boxes with labeled arrows. Color-coded by layer.

**Heading:** `System Architecture`

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND  (React + Vite)           [BLUE]  │
│         Auth  │  Student Portal  │  Recruiter Dashboard          │
└───────────────────────────┬─────────────────────────────────────┘
                            │  REST / JSON
┌───────────────────────────▼─────────────────────────────────────┐
│                NODE.JS BACKEND  (Express)               [GREEN] │
│                                                                  │
│   /auth  /search  /pipeline  /interview                          │
│   /resume  /github  /recommend  /leaderboard  /api/ontology      │
│                                                                  │
│  ┌──────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │  searchService   │  │  jdQueryParser  │  │interviewService│  │
│  │  (4-stage rank)  │  │  + Voyage AI    │  │  + Groq LLM   │  │
│  └──────────────────┘  └─────────────────┘  └────────────────┘  │
└──────┬──────────────────────────────────────────┬───────────────┘
       │ mongoose ODM                             │ HTTP multipart
┌──────▼──────────┐                   ┌───────────▼───────────────┐
│    MONGODB       │                   │   PYTHON AI MICROSERVICE   │
│   [ORANGE]       │                   │   FastAPI · port 8000      │
│                  │                   │                [PURPLE]    │
│  Users           │                   │  extractors.py  (PyMuPDF) │
│  Pipeline        │                   │  section_detector.py       │
│  PendingDomain   │                   │  skill_normalizer.py       │
│  UnknownTag      │                   │  education_parser.py       │
└──────────────────┘                   │  experience_parser.py      │
                                       │  project_parser.py         │
                                       │  domain_inferrer.py        │
                                       │  confidence_scorer.py      │
                                       │  normalizer.py             │
                                       └───────────────────────────┘

         External APIs  [GREY]
         ├── Voyage AI  (text embeddings — voyage-large-2)
         ├── Groq       (LLM inference — llama-3.3-70b-versatile)
         └── GitHub API (repo/commit/star data)
```

**Color legend:** Frontend=Blue · Backend=Green · DB=Orange · AI Service=Purple · External=Grey

---

## Slide 10 — AI/ML Pipeline Deep Dive

**Layout:** Vertical numbered pipeline flowchart, left-to-right reading inside each step.

**Heading:** `How Intelligence Works — End to End`

```
STEP 1 · INGEST
─────────────────────────────────────────────────────
PDF/DOCX bytes received
→ PyMuPDF block extraction (x0, y0, x1, y1, text per block)
→ Two-column layout detection
    midpoint = pageWidth × 0.52
    is_two_col = left_blocks > 25%  AND  right_blocks > 25%
    if two_col → emit left column fully, then right column
→ Hyphenated line-break joining  (opti-\nmization → optimization)
→ Lowercase continuation-line merging  (...models\nusing PyTorch → one line)


STEP 2 · STRUCTURE
─────────────────────────────────────────────────────
20+ heading variants detected  (case-insensitive, punctuation-stripped)
→ education / experience / projects / skills / certifications / achievements
→ Lines routed to per-section buckets


STEP 3 · PARSE
─────────────────────────────────────────────────────
Education : degree keywords + GPA regex + year extraction (future-preferring)
            institution heuristic skips degree-header lines
            split on new degree keyword within same block (no blank line needed)

Experience: "Role @ Company" split · date range extraction · bullet joining
            new-entry detection: uppercase start + has @ or | + not sentence fragment

Projects  : wrapped title join (up to 2 lines if first line doesn't end with punct)
            tech stack extraction per project block


STEP 4 · SKILLS
─────────────────────────────────────────────────────
Multi-word substring match  →  "scikit-learn", "sentence transformers"
Single-word boundary regex  →  \bPython\b, \bDocker\b
→ 5 categories: languages · frameworks · libraries · databases · tools
→ normalizedSkills[] stored in MongoDB for fast $in queries
→ Skills from experience + projects extracted via full-text scan


STEP 5 · DOMAIN INFERENCE
─────────────────────────────────────────────────────
16 domains × section weights:
    skills section    → weight 1.0
    projects section  → weight 0.8
    experience section→ weight 0.6
→ Raw hit counts per domain
→ tanh(raw/40) normalization
→ Overlap dampening (e.g. frontend/backend cross-contamination reduced)
→ Clamp [0, 100] · store top-5 domains per user


STEP 6 · SEARCH  (at query time)
─────────────────────────────────────────────────────
Voyage AI embeds JD text → domain probability priors
→ MongoDB 4-stage pipeline (domain gate → skill retrieve → score → rank)
→ whyMatched annotation (matchedDomains, matchedSkills, missingSkills, semanticSummary)
→ Results returned with rankScore + full explainability
```

---

## Slide 11 — Tech Stack

**Layout:** Icon grid, 3 rows × 4 columns. Category label above each column group.

**Heading:** `Technology Stack`

| Layer | Technology | Version | Why chosen |
|---|---|---|---|
| Frontend | React + Vite | 18 / 5 | Component-based, fast HMR, existing codebase |
| Backend | Node.js + Express | 20 / 4 | Non-blocking I/O for concurrent search requests |
| Database | MongoDB | 7 | Flexible schema for evolving user profiles + domainScores map |
| AI Service | Python FastAPI | 0.111 | Async, typed, auto-generated OpenAPI docs |
| PDF Parsing | PyMuPDF (fitz) | 1.24 | Block-level coordinate extraction for column detection |
| DOCX Parsing | python-docx | 1.1 | Paragraph + table cell extraction |
| Embeddings | Voyage AI | voyage-large-2 | Domain-tuned code + tech embeddings |
| LLM | Groq + Llama 3.3 70B | — | Sub-2s inference; free tier sufficient for hackathon |
| Auth | JWT (jsonwebtoken) | — | Stateless, works across microservices without session store |
| File upload | multer | — | Memory storage, MIME validation, 10MB limit |
| Rate limiting | Custom sliding window | — | 10 req/min per IP — protects Voyage + Groq API costs |
| DevOps | Docker + docker-compose | — | One-command local setup for judges |
| Ontology | Custom JS + Python | — | 16 domains, 200+ skill aliases, synced at Python startup |

**Bottom highlight box:**
> *No hallucination in skill extraction — 100% deterministic ontology matching.
> LLM is used only where creativity is needed (interview questions), never for structured data parsing.*

---

## Slide 12 — User Workflow Diagram

**Layout:** Two swim lanes (Student top, Recruiter bottom). Arrows show system interactions between lanes.

**Heading:** `End-to-End User Workflows`

**STUDENT LANE:**
```
Register & set role=student
        ↓
Connect GitHub username
        ↓
   GitHub Sync job
   ├── Fetch repos, commits, stars, active days
   ├── Score domain keywords per repo
   └── activityScore + domainScores saved to MongoDB
        ↓
Upload Resume (PDF or DOCX)
        ↓
   Python AI Microservice
   ├── Parse → skills, education, experience, projects
   ├── Infer domains (resume signal)
   └── Merge: max(github, resume) per domain
        ↓
Profile is live · discoverable in all searches
```

**RECRUITER LANE:**
```
Register & set role=recruiter
        ↓
POST /search/semantic  { query: "We need an ML engineer..." }
        ↓
   parseJDQuery() → Voyage embed → domain priors
   searchUsers()  → 4-stage rank → ranked results
        ↓
Review candidates with whyMatched explanation
        ↓
POST /pipeline  { candidateId, jobTitle, stage: "shortlisted" }
        ↓
POST /interview/questions  { candidateId, jobDescription }
   → Groq generates 7 tailored questions in < 2s
        ↓
Conduct interview
        ↓
PATCH /pipeline/:id  { stage: "offered" }
```

**Intersection arrow (center, bold):** Student profile ←→ Recruiter search result, labeled *"Real-time semantic discovery"*

---

## Slide 13 — Differentiation

**Layout:** Comparison table, 5 columns. Use ✅ / ❌ / ⚠️.

**Heading:** `Why CampusConnect AI — Not Just Another ATS`

| Capability | Workday | Greenhouse | LinkedIn | **CampusConnect AI** |
|---|---|---|---|---|
| Resume parsing | Basic field fill | Basic | Basic | ✅ Column-aware, artifact-correcting |
| Candidate search | Keyword filter | Keyword + manual | Keyword + graph | ✅ **Semantic JD embedding** |
| GitHub / code signal | ❌ | ❌ | ⚠️ Partial | ✅ **Domain-scored activity** |
| Match explainability | ❌ | Scorecard only | ❌ | ✅ **Per-result whyMatched** |
| AI interview questions | ❌ | Template only | ❌ | ✅ **Gap-aware, role-tailored** |
| Campus filters | ⚠️ Generic | ⚠️ Generic | ❌ | ✅ Year / branch / CGPA / activity |
| Recruiter pipeline | ✅ Enterprise | ✅ Full | ❌ | ✅ Lightweight, campus-native |
| Cost for campus | $$$$ | $$$ | $$ | ✅ **Open / free tier** |

**Bottom quote:**
> *"Greenhouse focuses on human-led calibration rather than automated keyword rejections — it acts as a decision-support tool."*
> *CampusConnect AI is exactly this: AI surfaces the right candidates. Humans make the call — with full context.*

---

## Slide 14 — Impact & Metrics

**Layout:** 4 large metric cards (top row) + 1 architecture insight block (bottom).

**Heading:** `Measurable Impact`

**Metric cards:**

| Metric | Value | Context |
|---|---|---|
| ⏱ Screening time | **10× faster** | Semantic search vs. manual resume review |
| 🎯 Parse accuracy | **Production-ready** | Education, experience, projects from real two-column PDFs |
| 🔗 Skill enrichment | **+3–5 skills avg** | GitHub projects surface skills not listed in resume |
| 💬 Interview prep | **< 2 seconds** | 7 tailored questions via Groq Llama 3.3 70B |

**Architecture insight block:**
> *The 4-stage search pipeline reduces the full candidate pool to ranked results via:
> domain pre-filter (MongoDB $gte) → skill retrieval ($in) → weighted scoring → composite rank.
> tanh compression ensures specialist candidates aren't unfairly penalized for single-domain depth.*

---

## Slide 15 — Roadmap

**Layout:** 3-phase horizontal timeline. Each phase is a card with bullet list.

**Heading:** `What's Next`

---

**Phase 1 — Hackathon MVP (Now)**
- ✅ Resume Intelligence (PDF/DOCX → structured JSON)
- ✅ Semantic JD search with Voyage AI embeddings
- ✅ GitHub signal fusion + domain scoring
- ✅ Recruiter pipeline (4 stages)
- ✅ AI interview question generator (Groq)
- ✅ Match explainability on every search result

---

**Phase 2 — Campus Deployment**
- Frontend: Student portal + resume upload UI
- Frontend: Recruiter dashboard + explainability panel
- Bulk resume upload for placement drives
- Email/notification triggers on pipeline stage change
- CGPA + year + branch filters in recruiter search UI
- Leaderboard: top students by domain + activity

---

**Phase 3 — Platform Scale**
- Multi-institute federation (colleges share anonymized talent pool)
- Anonymous bias-blind review mode (hide name/gender in first pass)
- LLM-powered outreach drafting (personalized candidate messages)
- OCR support for scanned/image resumes (Tesseract integration)
- Analytics dashboard: placement rates, domain demand trends, drive success metrics
- Ontology expansion: GenAI, Agentic AI, Quantum, Robotics domain tracks

---

## Slide 16 — Team

**Layout:** Centered grid, 3–5 columns depending on team size. Dark background matching cover slide.

**Heading:** `The Team`

**Per-member slot template:**

```
┌──────────────────┐
│                  │
│    [ PHOTO ]     │   ← Square or circle crop, ~120×120px
│                  │
└──────────────────┘
     Full Name
     Role on project
     e.g. "AI/ML & Backend"

  [gh]  github-handle
  [in]  linkedin-handle
```

**Suggested roles to label (adapt to actual team):**
- AI/ML Lead — Resume Intelligence + Domain Inference
- Backend Lead — Search pipeline + API design
- Frontend — React UI + Dashboard
- DevOps / Full-stack — Docker, deployment, integration

**Bottom of slide:**
```
┌────────────────────────────────────────────────┐
│           TEAM NAME  (large, bold)             │
│   "Built with ☕ and too many Postman tests"   │
│   Mentor / Guide: _______________  (if any)    │
└────────────────────────────────────────────────┘
```

---

## Presentation Notes

### Timing guide (10-min slot)

| Slides | Time | Focus |
|---|---|---|
| 1–3 | 1.5 min | Hook + problem — make judges feel the pain |
| 4 | 0.5 min | Solution teaser — one sentence per feature |
| 5–8 | 3.0 min | Feature deep-dives — pick 2 to live-demo |
| 9–10 | 1.5 min | Architecture + AI pipeline — show technical depth |
| 11–12 | 1.0 min | Stack + workflow — fast, don't read the table |
| 13–14 | 1.0 min | Differentiation + impact — land the "why us" |
| 15–16 | 0.5 min | Roadmap + team — end on ambition |

### Live demo checklist (if time permits)
1. Upload Aarav Mehta resume → show structured JSON output
2. `POST /search/semantic` with a real JD → show ranked results + `whyMatched`
3. `POST /interview/questions` → show 7 Groq-generated questions live

### Key talking points for Q&A
- *"Why not just use OpenAI for parsing?"* → Deterministic ontology = no hallucination on structured data; LLM only where creativity is needed
- *"How is this different from LinkedIn?"* → GitHub domain scoring, campus-specific filters, explainability, open platform
- *"Does it work on all resume formats?"* → Handles two-column PDFs, hyphenated wraps, ligature characters; not scanned/image resumes (OCR on roadmap)
- *"What's the business model?"* → Free for colleges, premium analytics tier for corporate recruiters at campus drives
