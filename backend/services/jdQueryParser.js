const { extractSkillsFromText } = require("./skills/extractSkills");
const { normalizeSkillName } = require("./skills/skillOntology");
const { groqChat } = require("./groqClient");
const { callVoyageAPI, getDomainEmbeddings, computeSims } = require("./semantic/voyageClient");
const { getRepoVec, setRepoVecs } = require("./semantic/embeddingCache");
const { DOMAIN_RULES } = require("./semantic/ontology");

// Minimum relevance for a domain to appear in topDomains (categorical output).
// The full domainRelevance vector is always returned for dot-product ranking.
const SEMANTIC_TOP_DOMAIN_THRESHOLD = 0.45;
const KEYWORD_TOP_DOMAIN_THRESHOLD  = 0.18;

const ALL_DOMAINS = [
  "frontend", "backend", "devops", "database", "systems",
  "ai_ml", "genai", "agentic_ai", "mlops", "data_science",
  "data_engineering",
  "algorithms", "cybersecurity", "blockchain", "embedded",
  "networking", "distributed_systems",
];

// ── Query Intent Classification ────────────────────────────────────────────────
//
// Intent scoring: keyword hit density across intent-specific vocabulary.
// Multiple intents blend via weighted sum so a mixed query like
// "software engineer with some LLM experience" smoothly interpolates.

const INTENT_SIGNALS = {
  generic_swe: [
    "programming", "problem solving", "problem-solving", "aptitude",
    "software development", "software engineering", "digital engineering",
    "fundamentals", "data structures", "coding", "developer",
    "computer science", "full stack", "fullstack", "internship",
    "technical round", "general purpose", "broad engineering",
    "software development role", "development role",
  ],
  specialized_ai: [
    "llm", "large language model", "fine-tuning", "finetuning",
    "transformer", "bert", "gpt", "neural network", "deep learning",
    "computer vision", "natural language processing", "nlp",
    "model training", "inference", "embedding", "semantic search",
    "rag", "retrieval augmented", "diffusion", "generative ai",
    "object detection", "image segmentation", "speech recognition",
  ],
  agentic: [
    "agent", "multi-agent", "multi agent", "autonomous agent",
    "orchestration", "tool calling", "tool use", "function calling",
    "crewai", "autogen", "langgraph", "adk", "mcp",
    "model context protocol", "agentic workflow", "agent framework",
  ],
  infra_devops: [
    "infrastructure", "cloud", "deployment", "ci/cd", "pipeline",
    "kubernetes", "docker", "terraform", "monitoring", "reliability",
    "sre", "platform engineering", "devops", "containerization",
    "load balancing", "auto scaling", "service mesh", "gitops",
  ],
  mlops_specific: [
    "mlops", "model serving", "model deployment", "mlflow", "kubeflow",
    "airflow", "feature store", "experiment tracking", "model monitoring",
    "continuous training", "data pipeline", "ml pipeline",
    "weights and biases", "wandb", "bentoml",
  ],
  frontend_ui: [
    "ui", "ux", "user interface", "user experience", "react", "frontend",
    "front-end", "design system", "component", "css", "animation",
    "web application", "responsive", "accessibility",
  ],
  data_engineering_analytics: [
    "etl", "extract transform load",
    "data engineering", "data engineer", "analytics engineering",
    "data pipeline", "batch pipeline", "data ingestion",
    "spark", "pyspark", "apache spark", "hadoop", "hive",
    "airflow", "data orchestration", "dag",
    "data warehouse", "warehouse", "redshift", "bigquery", "snowflake", "databricks",
    "data lake", "delta lake", "lakehouse", "apache iceberg",
    "dbt", "data build tool", "sql analytics",
    "cloud data platform", "data platform",
    "data quality", "data lineage", "data catalog", "data mesh",
    "analytics", "analytical", "business intelligence", "bi",
    "dimensional modeling", "star schema",
    "flink", "kafka streams", "data streaming",
    "parquet", "avro", "kinesis", "aws glue",
  ],
  systems_low: [
    "systems programming", "low level", "kernel", "memory management",
    "concurrency", "multithreading", "embedded", "firmware", "rtos",
    "c programming", "c++ programming", "rust", "performance critical",
    // Modern systems engineering — Go, Linux, infra runtimes
    "golang", "goroutine", "channel", "go runtime", "go scheduler",
    "systems engineering", "systems engineer", "systems intern",
    "linux engineering", "linux fundamentals", "linux systems",
    "c/c++", "c and c++", "performance engineering",
    "high performance", "low latency", "zero copy",
    "runtime engineering", "async io", "io multiplexing", "event loop",
    "posix", "system calls", "process management", "thread pool", "work stealing",
  ],
};

// ── Intent domain boosts (ADDITIVE) ───────────────────────────────────────────
//
// Values are added to independent sigmoid-based domain relevance scores.
// Scale: ±0.05 to ±0.20. Each boost is weighted by the intent's normalized score,
// so a weak intent contributes a proportionally smaller boost.
//
// Positive: nudge this domain up for this intent type.
// Negative: nudge this domain down — but never to zero (additive, not zeroing).
const INTENT_DOMAIN_BOOSTS = {
  data_engineering_analytics: {
    data_engineering:    +0.25,
    data_science:        +0.12,
    database:            +0.10,
    distributed_systems: +0.08,
    mlops:               -0.10,
    ai_ml:               -0.05,
    genai:               -0.15,
    agentic_ai:          -0.18,
    frontend:            -0.15,
    blockchain:          -0.15,
    embedded:            -0.15,
    systems:             -0.05,
  },
  generic_swe: {
    backend:            +0.12,
    algorithms:         +0.10,
    systems:            +0.05,
    devops:             +0.05,
    frontend:           +0.05,
    database:           +0.05,
    ai_ml:              -0.08,
    data_science:       -0.08,
    genai:              -0.15,
    mlops:              -0.15,
    agentic_ai:         -0.20,
    blockchain:         -0.10,
    embedded:           -0.05,
  },
  specialized_ai: {
    ai_ml:              +0.15,
    data_science:       +0.10,
    mlops:              +0.08,
    genai:              +0.08,
    agentic_ai:         +0.05,
    frontend:           -0.12,
    devops:             -0.05,
    blockchain:         -0.10,
    embedded:           -0.08,
    cybersecurity:      -0.08,
  },
  agentic: {
    agentic_ai:         +0.20,
    genai:              +0.12,
    ai_ml:              +0.05,
    frontend:           -0.15,
    systems:            -0.08,
    embedded:           -0.10,
    blockchain:         -0.10,
    devops:             -0.03,
  },
  infra_devops: {
    devops:             +0.10,
    distributed_systems:+0.10,
    backend:            +0.10,
    systems:            +0.08,
    networking:         +0.08,
    database:           +0.05,
    ai_ml:              -0.08,
    genai:              -0.12,
    agentic_ai:         -0.15,
    frontend:           -0.08,
    blockchain:         -0.10,
    embedded:           -0.03,
  },
  mlops_specific: {
    mlops:              +0.20,
    ai_ml:              +0.10,
    data_science:       +0.08,
    devops:             +0.08,
    agentic_ai:         -0.10,
    genai:              -0.05,
    frontend:           -0.15,
    blockchain:         -0.12,
    embedded:           -0.10,
  },
  frontend_ui: {
    frontend:           +0.20,
    backend:            +0.05,
    ai_ml:              -0.10,
    genai:              -0.10,
    agentic_ai:         -0.15,
    mlops:              -0.15,
    systems:            -0.08,
    blockchain:         -0.10,
    embedded:           -0.08,
    networking:         -0.08,
  },
  systems_low: {
    systems:            +0.18,
    embedded:           +0.10,
    networking:         +0.08,
    distributed_systems:+0.05,
    algorithms:         +0.05,
    genai:              -0.15,
    agentic_ai:         -0.18,
    mlops:              -0.12,
    frontend:           -0.15,
    blockchain:         -0.12,
    data_science:       -0.05,
  },
};

// ── Intent classification ─────────────────────────────────────────────────────

function classifyQueryIntent(queryLower) {
  const raw = {};
  for (const [intent, keywords] of Object.entries(INTENT_SIGNALS)) {
    raw[intent] = keywords.filter(kw => queryLower.includes(kw)).length / keywords.length;
  }

  const totalRaw = Object.values(raw).reduce((s, v) => s + v, 0);

  if (totalRaw === 0) {
    return { primary: "generic_swe", confidence: 0.3, scores: { generic_swe: 1.0 } };
  }

  const scores = {};
  for (const [intent, score] of Object.entries(raw)) {
    scores[intent] = score / totalRaw;
  }

  const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
  return { primary: sorted[0][0], confidence: sorted[0][1], scores };
}

// ── Sigmoid-based independent domain relevance ────────────────────────────────
//
// Replaces softmax. Each domain gets an independent score in [0,1].
// Mean-centered sigmoid: domains above the average cosine sim get > 0.5,
// below average get < 0.5. No zero-sum competition between domains.
//
// SIGMOID_TEMP controls contrast: higher → sharper separation.
// At SIGMOID_TEMP=8: a 0.15 deviation from mean → relevance ≈ 0.70 or 0.30.
const SIGMOID_TEMP = 8;

function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }

function querySimsToRelevance(sims) {
  const simValues = Object.values(sims);
  const meanSim   = simValues.reduce((s, v) => s + v, 0) / simValues.length;
  const relevance = {};
  for (const [domain, sim] of Object.entries(sims)) {
    relevance[domain] = sigmoid((sim - meanSim) * SIGMOID_TEMP);
  }
  return relevance;
}

// ── Additive intent boosts ────────────────────────────────────────────────────
//
// Applies weighted additive boosts from each active intent.
// Weight = intent's normalized probability score so weak intents contribute less.
// Clamped to [0, 1] — never zeroes a domain, never overflows.
function applyIntentBoosts(domainRelevance, intentScores) {
  const boosted = { ...domainRelevance };
  for (const [intent, score] of Object.entries(intentScores)) {
    if (score === 0) continue;
    const boosts = INTENT_DOMAIN_BOOSTS[intent] || {};
    for (const [domain, boost] of Object.entries(boosts)) {
      if (boosted[domain] !== undefined) {
        boosted[domain] = Math.max(0, Math.min(1, boosted[domain] + boost * score));
      }
    }
  }
  return boosted;
}

// ── LLM skill extraction (Groq) ───────────────────────────────────────────────
//
// Step 1: Groq extracts a raw token list — catches conceptual terms ("penetration testing",
//         "tcp/ip", "authentication") that the ontology pattern-matcher can't see.
// Step 2: Each token is mapped through normalizeSkillName. Recognized tokens become
//         canonical display names (e.g. "react.js" → "React"). Unknown tokens are kept
//         as-is (lowercase) so they still work for $in matching if the candidate has them.
// Falls back to ontology-only extraction if Groq is unavailable or errors.

// Suffixes that LLMs append to skill names but that the ontology doesn't include.
// Stripped in order — longest first so "web development" doesn't partially strip "development".
const STRIP_SUFFIXES = [
  " web development", " development", " developer", " engineer", " engineering",
  " programming", " framework", " library", " platform", " tool", " tools",
  " concepts", " fundamentals", " skills", " knowledge",
];

// Try normalizeSkillName, then progressively strip common LLM suffixes.
// Returns the canonical display name (lowercased) or the raw token if nothing matches.
function canonicalizeToken(raw) {
  const token = raw.toLowerCase().trim();
  if (!token) return null;

  // 1. Direct lookup
  let display = normalizeSkillName(token);
  if (display) return display.toLowerCase();

  // 2. Strip trailing suffix and retry
  for (const suffix of STRIP_SUFFIXES) {
    if (token.endsWith(suffix)) {
      const stripped = token.slice(0, token.length - suffix.length).trim();
      display = normalizeSkillName(stripped);
      if (display) return display.toLowerCase();
    }
  }

  // 3. Strip trailing plural 's' as last resort ("rest apis" → "rest api")
  if (token.endsWith("s")) {
    display = normalizeSkillName(token.slice(0, -1));
    if (display) return display.toLowerCase();
  }

  // 4. Keep as-is — still useful for $in matching if candidate has it
  return token;
}

const GROQ_SKILL_PROMPT = `You are a technical skill extractor for a campus hiring platform.

Extract every specific, matchable skill from the job description — anything concrete enough to appear on a resume and be verified. This includes all technical domains:
- Languages: python, java, go, rust, c++, typescript
- Frameworks & libraries: react, pytorch, spring boot, fastapi, langchain
- Tools & platforms: docker, kubernetes, postgresql, redis, aws, linux, git, wireshark, nmap, burp suite
- Protocols & standards: tcp/ip, grpc, rest api, websockets, http, tls, oauth
- Security skills: penetration testing, network security, cryptography, authentication, vulnerability assessment, owasp, firewalls, ids/ips, secure coding
- Data & ML skills: sql, spark, kafka, feature engineering, model training, mlflow
- Systems skills: memory management, multithreading, concurrency, posix, kernel programming
- Any other specific, learnable technical skill from any domain

Strip qualifiers — extract the skill itself:
- "Linux fundamentals" → "linux"
- "REST APIs" or "RESTful APIs" → "rest api"
- "penetration testing basics" → "penetration testing"
- "TCP/IP networking" → "tcp/ip"

Skip only truly generic labels that cannot be matched to a skill:
- Domain buckets: "backend", "frontend", "cloud", "web", "mobile"
- Pure soft skills: "problem solving", "teamwork", "communication"
- Bare ambiguous letters: "c" alone, "r" alone (but "c++" is fine)

Return ONLY a JSON array of lowercase strings. No explanation, no markdown.
Example: ["python", "pytorch", "docker", "linux", "rest api", "penetration testing", "tcp/ip"]`;

async function groqExtractSkills(queryText) {
  const raw = await groqChat(
    [
      { role: "system", content: GROQ_SKILL_PROMPT },
      { role: "user",   content: queryText },
    ],
    { temperature: 0.1, maxTokens: 800 }
  );

  const clean = raw.replace(/```(?:json)?/gi, "").trim();
  const arr = JSON.parse(clean);
  if (!Array.isArray(arr)) throw new Error("Groq returned non-array");
  console.log(`[jdQueryParser] LLM raw tokens (${arr.length}):`, arr);

  // Abstract or vague tokens to drop even if the LLM includes them.
  // This is the single filter — no separate length check, so short but real
  // language names like "go" (canonicalized from "golang") pass through.
  const ABSTRACT_TOKENS = new Set([
    "ai", "ml", "dl", "nlp",
    "cloud", "automation", "backend", "frontend", "fullstack",
    "full stack", "software", "programming", "development", "engineering",
    "algorithms", "data structures", "problem solving", "aptitude",
    "web", "mobile", "api", "database", "devops", "infrastructure",
    "ui", "ux", "db", "os",
    // Single bare language letters — too ambiguous in campus context;
    // use specific aliases instead ("c++" stays, "c" alone does not)
    "c", "r",
  ]);

  const skills = new Set();
  for (const token of arr) {
    const c = canonicalizeToken(String(token));
    if (!c) continue;
    if (ABSTRACT_TOKENS.has(c)) continue;
    skills.add(c);
  }
  return [...skills];
}

// ── Skill extraction ──────────────────────────────────────────────────────────
// Returns { canonical, expanded }
// canonical — what to show in UI (missingSkills, extractedSkills)
// expanded  — superset used for $in DB matching (includes implied technologies)

async function extractSkills(queryText) {
  if (process.env.GROQ_API_KEY) {
    try {
      const skills = await groqExtractSkills(queryText);
      console.log(`[jdQueryParser] LLM skills (${skills.length}):`, skills);
      return skills;
    } catch (err) {
      console.warn(`[jdQueryParser] Groq skill extraction failed, falling back to ontology: ${err.message}`);
    }
  }

  // Fallback: ontology pattern matching
  const skillSets = extractSkillsFromText(queryText);
  const all = new Set();
  for (const set of Object.values(skillSets)) {
    for (const skill of set) all.add(skill.toLowerCase());
  }
  return [...all];
}

// ── Keyword-only domain extraction ───────────────────────────────────────────

function keywordDomains(queryText) {
  const lower = queryText.toLowerCase();
  const rawScores = {};
  for (const [domain, keywords] of Object.entries(DOMAIN_RULES)) {
    rawScores[domain] = keywords.filter(kw => lower.includes(kw)).length;
  }

  const maxHits = Math.max(...Object.values(rawScores), 1);

  // Normalize keyword hit counts to [0,1] per domain (independent, not softmax).
  // maxHits denominator preserves relative signal strength without zero-sum competition.
  let domainRelevance = {};
  for (const domain of ALL_DOMAINS) {
    domainRelevance[domain] = (rawScores[domain] || 0) / maxHits;
  }

  const topDomains = Object.entries(domainRelevance)
    .filter(([, r]) => r >= KEYWORD_TOP_DOMAIN_THRESHOLD)
    .sort(([, a], [, b]) => b - a)
    .map(([domain]) => domain);

  return {
    domainRelevance,
    topDomains,
    domainConfidences: domainRelevance,
    extractionMethod:  "keyword-only",
  };
}

// ── Semantic (Voyage) domain extraction ──────────────────────────────────────

async function semanticDomains(queryText) {
  let queryVec = getRepoVec(queryText);
  if (!queryVec) {
    const vecs = await callVoyageAPI([queryText], "query");
    queryVec   = vecs[0];
    setRepoVecs([queryText], [queryVec]);
  }

  const domainEmbeddings = await getDomainEmbeddings();
  const sims = computeSims(queryVec, domainEmbeddings);

  // Independent sigmoid-based relevance — no softmax, no zero-sum competition.
  const sigsRelevance = querySimsToRelevance(sims);

  const topDomains = Object.entries(sigsRelevance)
    .filter(([, r]) => r >= SEMANTIC_TOP_DOMAIN_THRESHOLD)
    .sort(([, a], [, b]) => b - a)
    .map(([domain]) => domain);

  return {
    domainRelevance:   sigsRelevance,
    topDomains,
    domainConfidences: sigsRelevance,
    extractionMethod:  "semantic",
  };
}

// ── Main entry point ──────────────────────────────────────────────────────────

async function parseJDQuery(queryText) {
  const skills = await extractSkills(queryText);

  if (!process.env.VOYAGE_API_KEY) {
    return { skills, ...keywordDomains(queryText) };
  }

  try {
    const domainResult = await semanticDomains(queryText);
    return { skills, ...domainResult };
  } catch (err) {
    console.warn(`[jdQueryParser] Voyage failed, falling back to keyword-only: ${err.message}`);
    return { skills, ...keywordDomains(queryText) };
  }
}

module.exports = { parseJDQuery };
