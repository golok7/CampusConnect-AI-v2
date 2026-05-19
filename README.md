# CampusConnect AI

> **AI-powered campus placement & recruitment platform** — intelligent resume parsing, semantic job matching, GitHub profiling, mock AI interviews, and a full recruiter pipeline. Built for scale.

USP : We Use Github profile + Resume as a source of truth for talent acquisition.
**Live Demo:** [https://campusconnect-frontend-sooty.vercel.app](https://campusconnect-frontend-sooty.vercel.app)

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
  - [Prerequisites](#prerequisites)
  - [Option A — Docker (recommended)](#option-a--docker-recommended)
  - [Option B — Manual Setup](#option-b--manual-setup)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [AI Service Deep Dive](#ai-service-deep-dive)
- [Contributing](#contributing)

---

## Overview

CampusConnect AI bridges the gap between students and recruiters by replacing manual screening with AI. Students upload their resume once; the platform extracts skills, scores domains, profiles their GitHub activity, and matches them to relevant drives and jobs — all in real time.

Recruiters get a structured pipeline view, semantic candidate search, and ranked shortlists without writing a single boolean query.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Browser (React)                     │
│   Student Dashboard · Recruiter Dashboard · Jobs ·      │
│   Resume · Mock Interview · Leaderboard · Analytics     │
└────────────────────┬────────────────────────────────────┘
                     │ REST / JSON
┌────────────────────▼────────────────────────────────────┐
│              Node.js / Express  (port 5000)              │
│  Auth · GitHub Intel · Semantic Search · Recommendations│
│  Drive Pipeline · Interview · Leaderboard · Analytics   │
└──────────┬──────────────────────────────────────────────┘
           │ internal HTTP
┌──────────▼──────────────────────┐   ┌──────────────────┐
│  FastAPI AI Service (port 8000) │   │  MongoDB Atlas   │
│  Resume Intelligence Engine     │   │  (cloud / local) │
│  • Section detection            │   └──────────────────┘
│  • Skill extraction & ontology  │
│  • Domain inference             │   ┌──────────────────┐
│  • Confidence scoring           │   │  Groq LLM API    │
│  • Education / Exp / Project    │   │  VoyageAI Embeds │
│    parsers                      │   │  GitHub API      │
└─────────────────────────────────┘   └──────────────────┘
```

---

## Features

### For Students
- **Resume Intelligence** — upload PDF/DOCX; AI extracts skills (categorised into languages, frameworks, databases, tools), education, experience, projects, certifications, and research publications with per-field confidence scores
- **Domain Profiling** — automatic scoring across 15+ tech domains (Web Dev, ML, DevOps, Systems, etc.)
- **GitHub Intelligence** — contribution graph analysis, repo scoring, language breakdown, collaboration scoring
- **AI Mock Interviews** — role-specific, dynamic question generation powered by Groq LLM with real-time speech recognition
- **Semantic Job Matching** — VoyageAI embeddings rank jobs by actual skill overlap, not keyword count
- **Leaderboard** — gamified profile completeness and activity score

### For Recruiters
- **Structured Pipeline** — Kanban-style candidate pipeline with stage management
- **Semantic Search** — natural-language candidate queries ("Python ML engineer with 2 years XP")
- **Drive Management** — create/manage placement drives, set eligibility filters, track applications
- **Analytics Dashboard** — placement funnel metrics, domain distribution, acceptance rate trends

### Platform
- JWT authentication with role-based access (student / recruiter / admin)
- Skill ontology with 500+ tech skills, aliases, and domain mappings — hot-loadable from DB
- Unknown skill detection and crowd-sourced ontology growth

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion, Recharts |
| Backend | Node.js, Express 5, Mongoose, JWT, Multer |
| AI Service | Python 3.10+, FastAPI, Pydantic, httpx |
| LLM | Groq (Llama 3) |
| Embeddings | VoyageAI |
| Database | MongoDB (Atlas or local) |
| External APIs | GitHub REST API |
| Containerisation | Docker, Docker Compose |
| Icons | Phosphor Icons |

---

## Project Structure

```
CampusConnect-AI-v2/
├── frontend/                  # React + Vite SPA
│   ├── src/
│   │   ├── pages/             # StudentDashboard, RecruiterDashboard, Resume,
│   │   │                      # MockInterview, Jobs, DrivePage, Leaderboard,
│   │   │                      # Analytics, Explore, Login, Register, Profile
│   │   ├── components/
│   │   │   └── layout/
│   │   ├── contexts/          # Auth context
│   │   └── services/api.js    # Axios client
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── backend/                   # Express API server
│   ├── controllers/           # authController, resumeController,
│   │                          # driveController, recommendationController,
│   │                          # searchController, ...
│   ├── models/                # User, Drive, Job, Pipeline,
│   │                          # InterviewSession, MockInterview, ...
│   ├── routes/                # auth, resume, jobs, drive, interview,
│   │                          # search, recommendation, analytics,
│   │                          # leaderboard, github, ontology, pipeline
│   ├── services/              # githubService, recommendationService,
│   │                          # resumeImprovementService, searchService
│   ├── scripts/seedUsers.js   # DB seed script
│   └── server.js
│
├── ai-service/                # FastAPI resume intelligence microservice
│   ├── main.py                # /resume/parse endpoint
│   └── app/
│       ├── section_detector.py
│       ├── skill_normalizer.py
│       ├── ontology_snapshot.py
│       ├── domain_inferrer.py
│       ├── confidence_scorer.py
│       ├── education_parser.py
│       ├── experience_parser.py
│       ├── project_parser.py
│       ├── cert_parser.py
│       ├── research_parser.py
│       ├── summary_generator.py
│       └── extractors.py
│
└── docker-compose.yml
```

---

## Quick Start

### Prerequisites

| Tool | Version |
|---|---|
| Node.js | 18+ |
| Python | 3.10+ |
| MongoDB | Atlas cluster or local 6+ |
| Docker & Docker Compose | any recent version (optional) |

---

### Option A — Docker (recommended)

1. **Clone the repo**

   ```bash
   git clone https://github.com/golok7/CampusConnect-AI-v2.git
   cd CampusConnect-AI-v2
   ```

2. **Create the root `.env` file**

   ```bash
   cp .env.example .env
   # Fill in the values — see Environment Variables section below
   ```

3. **Start all services**

   ```bash
   docker compose up --build
   ```

   | Service | URL |
   |---|---|
   | Backend API | http://localhost:5000 |
   | AI Service | http://localhost:8000 (internal) |

4. **Start the frontend** (outside Docker for fast HMR)

   ```bash
   cd frontend
   npm install
   npm run dev
   # → http://localhost:5173
   ```

---

### Option B — Manual Setup

#### 1. Clone

```bash
git clone https://github.com/golok7/CampusConnect-AI-v2.git
cd CampusConnect-AI-v2
```

#### 2. Backend

```bash
cd backend
npm install
cp .env.example .env   # fill in values
npm run dev            # nodemon → http://localhost:5000
```

#### 3. AI Service

```bash
cd ai-service

# create and activate virtual environment
python -m venv .venv

# macOS / Linux
source .venv/bin/activate

# Windows (PowerShell)
.venv\Scripts\Activate.ps1

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

> The AI service auto-fetches the skill ontology from the backend on startup. If the backend is unreachable it falls back to the bundled snapshot automatically.

#### 4. Frontend

```bash
cd frontend
npm install
npm run dev   # Vite → http://localhost:5173
```

#### 5. Seed demo data (optional)

```bash
cd backend
node scripts/seedUsers.js
```

---

## Environment Variables

Create `backend/.env` (and a root `.env` for Docker Compose):

```env
# ── Database ────────────────────────────────────────────
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/campusconnect

# ── Auth ────────────────────────────────────────────────
JWT_SECRET=<long-random-hex-string>

# ── External APIs ───────────────────────────────────────
GITHUB_TOKEN=ghp_<your-github-pat>        # needs read:user, public_repo scopes
GROQ_API_KEY=gsk_<your-groq-key>          # LLM for mock interviews & resume improvement
VOYAGE_API_KEY=pa-<your-voyage-key>       # semantic embeddings for search & recommendations

# ── Service URLs ────────────────────────────────────────
RESUME_PARSER_URL=http://localhost:8000   # Docker sets this automatically
PORT=5000

# ── AI Service (optional) ───────────────────────────────
OPENAI_API_KEY=sk-<key>                   # only needed for LLM-generated resume summaries
NODE_BACKEND_URL=http://localhost:5000
```

### Getting API Keys

| Service | Where to get it | Free tier |
|---|---|---|
| MongoDB Atlas | [cloud.mongodb.com](https://cloud.mongodb.com) | 512 MB M0 cluster |
| Groq | [console.groq.com](https://console.groq.com) | generous free tier |
| VoyageAI | [dash.voyageai.com](https://dash.voyageai.com) | 50M tokens free |
| GitHub PAT | Settings → Developer settings → Personal access tokens | free |

---

## API Reference

All endpoints are prefixed `/api`.

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Register student or recruiter |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/profile/:id` | Get user profile |
| POST | `/api/resume/upload` | Upload resume — triggers full AI parse |
| GET | `/api/resume/improve` | AI-powered resume improvement suggestions |
| GET | `/api/jobs` | List jobs |
| GET | `/api/recommendation` | Personalised job recommendations |
| GET | `/api/search` | Semantic candidate / job search |
| GET | `/api/github/:username` | GitHub intelligence report |
| GET/POST | `/api/drive` | List / create placement drives |
| GET/POST | `/api/interview` | Mock interview sessions |
| GET | `/api/analytics` | Platform analytics |
| GET | `/api/leaderboard` | Student leaderboard |
| GET | `/api/ontology/skills` | Skill ontology (used by AI service) |
| GET/POST | `/api/pipeline` | Recruiter candidate pipeline |

---

## AI Service Deep Dive

The FastAPI microservice at `POST /resume/parse` runs a multi-stage NLP pipeline with no heavy model required at inference time:

```
PDF / DOCX upload
      ↓
TextExtractor       — pdfminer / python-docx text extraction
      ↓
normalize_text      — Unicode normalisation, whitespace cleanup
      ↓
SectionDetector     — heading pattern matching
                      → {skills, education, experience, projects,
                          certifications, research}
      ↓
SkillNormalizer     — ontology lookup + alias resolution + token matching
                      → {languages, frameworks, libraries, databases, tools}
      ↓
DomainInferrer      — keyword scoring across 15 domains + overlap dampening
      ↓
EducationParser / ExperienceParser / ProjectParser
CertParser / ResearchParser
      ↓
ConfidenceScorer    — per-section + overall confidence [0–1]
      ↓
SummaryGenerator    — template-based (fast) or Groq LLM (rich)
      ↓
ParseResponse       — full structured JSON
```

**Sample response (abridged)**

```json
{
  "skills": {
    "languages": ["Python", "TypeScript"],
    "frameworks": ["FastAPI", "React"],
    "databases": ["MongoDB", "PostgreSQL"],
    "tools": ["Docker", "Git"]
  },
  "normalizedSkills": ["python", "typescript", "fastapi", "react"],
  "topDomains": [
    { "domain": "Web Development", "score": 42 },
    { "domain": "Machine Learning", "score": 28 }
  ],
  "education": [
    { "institution": "IIT Delhi", "cgpa": 8.9, "graduationYear": 2025, "confidence": 0.95 }
  ],
  "experience": [{ "company": "Acme Corp", "role": "SWE Intern", "durationMonths": 6 }],
  "projects": [{ "name": "SmartSearch", "techStack": ["Python", "Elasticsearch"] }],
  "confidence": { "skills": 0.91, "education": 0.95, "overallConfidence": 0.87 },
  "unknownSkills": ["SomeObscureLib"],
  "warnings": []
}
```

---

## Contributing

1. Fork the repo and create a feature branch: `git checkout -b feat/your-feature`
2. Make your changes and verify the full stack runs locally
3. Keep commits focused and write a clear PR description
4. Open a pull request against `main`

---

<p align="center">Built with speed and purpose.</p>
