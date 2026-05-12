const { DOMAIN_RULES, DEP_MAP } = require("../semantic/ontology");
const { match, cleanText } = require("../utils/textUtils");
const {
  SECURITY_NAME_SIGNALS, SECURITY_NAME_REGEXES,
  SECURITY_TOPICS, SECURITY_DESC_REGEXES,
  DSA_HARD_SIGNALS, DSA_NAME_SIGNALS,
  COURSE_HARD_SIGNALS, COURSE_SOFT_SIGNALS, COURSE_SIGNALS,
  ML_RESEARCH_METADATA_NOISE_TERMS, ML_RESEARCH_METADATA_NOISE_REGEXES,
  BACKEND_GENERIC_TERMS,
  PHASE1_HINTS,
} = require("./config");

// ================= SIGNAL WEIGHTS =================
// Dependencies carry the cleanest semantic signal; metadata/readme are noisier.
const SIGNAL_WEIGHTS = {
  metadata:     0.5,
  readme:       0.7,
  dependencies: 1.0,
};

// ================= CLASSIFICATION HELPERS =================

function isConfigRepo(repo, username, name, topics) {
  if (name === (username || "").toLowerCase())
    return { type: "config", reason: "name matches username (profile README)" };
  const hit = topics.find(t => ["config", "dotfiles", "portfolio", "profile"].includes(t));
  if (hit) return { type: "config", reason: `topic: "${hit}"` };
  return null;
}

function isForkWorthKeeping(repo) {
  if (!repo.fork) return null;
  // All forks must go through the fork scoring pipeline (forkTier + forkContributionScore).
  // Returning type:"project" here caused starred forks to bypass contribution-aware scoring
  // and receive full owned-repo weight — masking passive clones as genuine contributions.
  if (repo.stargazers_count >= 1)
    return { type: "fork", reason: `fork — kept: ${repo.stargazers_count} star(s)` };
  if (repo.forks_count >= 1)
    return { type: "fork", reason: `fork — kept: forked by others (${repo.forks_count})` };
  return { type: "fork", reason: "fork with 0 stars and 0 downstream forks" };
}

function isNoiseRepo(repo, name) {
  if (repo.description || repo.stargazers_count > 0 || repo.language) return null;
  if (SECURITY_NAME_REGEXES.some(rx => rx.test(name)))
    return { type: "project", reason: "no metadata but security name — kept as project" };
  return { type: "noise", reason: "no description, no language, 0 stars" };
}

function isDSARepo(name, topics) {
  const nameAndTopics = `${name} ${topics.join(" ")}`;
  const hardHit = DSA_HARD_SIGNALS.find(s => nameAndTopics.includes(s));
  if (hardHit) return { type: "dsa", reason: `hard DSA signal in name/topics: "${hardHit}"` };
  const softHit = DSA_NAME_SIGNALS.find(s => name.includes(s));
  if (softHit) return { type: "dsa", reason: `soft DSA signal in name: "${softHit}"` };
  return null;
}

function isCourseRepo(combined) {
  const hardHit = COURSE_HARD_SIGNALS.find(s => combined.includes(s));
  if (hardHit) return { type: "course", reason: `course signal: "${hardHit}"` };
  // Require 2+ soft signals to avoid false positives on real student projects.
  const softHits = COURSE_SOFT_SIGNALS.filter(s => combined.includes(s));
  if (softHits.length >= 2)
    return { type: "course", reason: `course signals: ${softHits.slice(0, 3).join(", ")}` };
  return null;
}

// ================= DOMAIN CLASSIFIERS =================

function isCybersecurityRepo(repo) {
  const name   = (repo.name || "").toLowerCase();
  const desc   = (repo.description || "").toLowerCase();
  const topics = (repo.topics || []).map(t => t.toLowerCase());

  if (SECURITY_NAME_REGEXES.some(rx => rx.test(name))) return true;
  if (topics.some(t => SECURITY_TOPICS.includes(t))) return true;
  if (SECURITY_DESC_REGEXES.some(rx => rx.test(desc))) return true;

  return false;
}

function isMlResearchRepo(repo, deps) {
  const lang = (repo.language || "").toLowerCase();

  const mlSignals = [
    "pytorch", "tensorflow", "torch", "scikit", "numpy", "jax", "keras",
    // ML infra
    "onnxruntime", "tensorrt", "vllm", "llama-cpp-python", "ggml", "cupy",
  ];

  // Path A — Python, no description, ML deps present
  if (lang === "python" && !repo.description) {
    const webSignals = ["express", "fastapi", "flask", "django", "node", "nextjs", "react"];
    if (webSignals.some(f => deps.includes(f))) return false;
    return mlSignals.some(m => deps.includes(m));
  }

  // Path B — Python, description contains ML keywords, not a data science app
  if (lang === "python" && repo.description) {
    const desc = repo.description.toLowerCase();
    const mlDescSignals = [
      "neural", "classification", "segmentation", "detection", "nlp",
      "deep learning", "machine learning", "transformer", "resnet",
      "siamese", "encoder", "decoder", "prediction", "folding",
    ];
    if (!mlDescSignals.some(s => desc.includes(s))) return false;
    const dataScienceDesc = ["data analysis", "eda", "analytics", "dashboard", "visualization", "kaggle"];
    if (dataScienceDesc.some(s => desc.includes(s))) return false;
    const webSignals = ["express", "fastapi", "flask", "django", "node", "nextjs", "react"];
    if (webSignals.some(f => deps.includes(f))) return false;
    return true;
  }

  // Path C — No language, no description, ML name + ML deps
  if (!lang && !repo.description) {
    const mlNameSignals = ["protein", "folding", "prediction", "neural", "classification"];
    const mlDepSignals  = [
      "pytorch", "tensorflow", "torch", "scikit", "numpy", "keras", "streamlit",
      "onnxruntime", "tensorrt", "vllm", "llama-cpp-python",
    ];
    const repoName = (repo.name || "").toLowerCase();
    if (mlNameSignals.some(s => repoName.includes(s)) && mlDepSignals.some(m => deps.includes(m)))
      return true;
  }

  // Path D — Jupyter Notebook is always ML/research, never embedded dev
  if (lang === "jupyter notebook") {
    const embeddedDeps = ["micropython", "paho-mqtt", "freertos", "arduino", "rtos"];
    if (!embeddedDeps.some(d => deps.includes(d))) return true;
  }

  return false;
}

// ================= TOP-LEVEL CLASSIFIER =================

function classifyRepo(repo, username) {
  const name     = (repo.name || "").toLowerCase();
  const desc     = (repo.description || "").toLowerCase();
  const topics   = (repo.topics || []).map(t => t.toLowerCase());
  const combined = `${name} ${desc} ${topics.join(" ")}`;

  return (
    isConfigRepo(repo, username, name, topics) ||
    isForkWorthKeeping(repo) ||
    isNoiseRepo(repo, name) ||
    isDSARepo(name, topics) ||
    isCourseRepo(combined) ||
    { type: "project", reason: "default — no disqualifying signals" }
  );
}

function getRepoWeight(type) {
  return (
    { project: 1.0, fork: 0.2, dsa: 0.1, course: 0.17, config: 0.05, noise: 0.05 }[type] ?? 0.5
  );
}

// ================= DOMAIN SCORING =================

// Scores domains from keyword signals.
// Pass PHASE1_HINTS as `rules` for Phase 1 metadata-only scans;
// omit (defaults to full DOMAIN_RULES) for later pipeline stages.
function scoreDomains(signals, rules = DOMAIN_RULES) {
  const scores = {};
  const hits   = {};

  for (const domain in rules) {
    let score = 0;
    const domainHits = [];
    for (const keyword of rules[domain]) {
      let ks = 0;
      if (match(signals.metadata,     keyword)) { ks += SIGNAL_WEIGHTS.metadata;     domainHits.push(`meta:${keyword}`); }
      if (match(signals.readme,       keyword)) { ks += SIGNAL_WEIGHTS.readme;        domainHits.push(`readme:${keyword}`); }
      if (match(signals.dependencies, keyword)) { ks += SIGNAL_WEIGHTS.dependencies;  domainHits.push(`dep:${keyword}`); }
      score += ks;
    }
    if (score > 0) { scores[domain] = score; hits[domain] = domainHits; }
  }

  for (const dep in DEP_MAP) {
    if (match(signals.dependencies, dep)) {
      const d = DEP_MAP[dep];
      scores[d] = (scores[d] || 0) + 1.5;
      hits[d]   = hits[d] || [];
      hits[d].push(`depmap:${dep}`);
    }
  }

  if (signals.language) {
    const FRONTEND_LANGS = new Set(["javascript", "typescript"]);
    const lang = signals.language.toLowerCase();
    const langMap = {
      "jupyter notebook": "ai_ml",
      "matlab":           "embedded",
      "vhdl":             "embedded",
      "verilog":          "embedded",
      "solidity":         "blockchain",
    };

    if (FRONTEND_LANGS.has(lang)) {
      const hasFrontendKw = DOMAIN_RULES.frontend.some(
        kw => match(signals.metadata, kw) || match(signals.readme, kw)
      );
      if (hasFrontendKw) {
        scores["frontend"] = (scores["frontend"] || 0) + 0.8;
        hits["frontend"]   = hits["frontend"] || [];
        hits["frontend"].push(`lang:${signals.language}`);
      }
    } else if (["c++", "c"].includes(lang)) {
      const hasSystemsKw = DOMAIN_RULES.systems.some(
        kw => match(signals.metadata, kw) || match(signals.readme, kw)
      );
      if (hasSystemsKw) {
        scores["systems"] = (scores["systems"] || 0) + 0.8;
        hits["systems"]   = hits["systems"] || [];
        hits["systems"].push(`lang:${signals.language}`);
      }
    } else {
      const mapped = langMap[lang];
      if (mapped) {
        scores[mapped] = (scores[mapped] || 0) + 0.8;
        hits[mapped]   = hits[mapped] || [];
        hits[mapped].push(`lang:${signals.language}`);
      }
    }
  }

  return scores;
}

// Phase 1 (metadata-only scan): strips known ML research noise terms from
// metadata before scoring, and uses PHASE1_HINTS instead of the full ontology.
function scoreDomainsGuarded(signals, repo, deps = "") {
  let effectiveSignals = signals;

  if (isMlResearchRepo(repo, deps) && signals.metadata) {
    let cleanedMeta = signals.metadata;
    for (const rx of ML_RESEARCH_METADATA_NOISE_REGEXES) {
      cleanedMeta = cleanedMeta.replace(rx, " ");
    }
    if (cleanedMeta !== signals.metadata) {
      effectiveSignals = { ...signals, metadata: cleanedMeta };
    }
  }
  return scoreDomains(effectiveSignals, PHASE1_HINTS);
}

module.exports = {
  SIGNAL_WEIGHTS,
  // signal arrays — re-exported for consumers that import from this module
  SECURITY_NAME_SIGNALS,
  DSA_HARD_SIGNALS,
  DSA_NAME_SIGNALS,
  COURSE_SIGNALS,
  COURSE_HARD_SIGNALS,
  COURSE_SOFT_SIGNALS,
  ML_RESEARCH_METADATA_NOISE_TERMS,
  BACKEND_GENERIC_TERMS,
  PHASE1_HINTS,
  // classifier helpers
  isConfigRepo,
  isForkWorthKeeping,
  isNoiseRepo,
  isDSARepo,
  isCourseRepo,
  // domain classifiers
  isCybersecurityRepo,
  isMlResearchRepo,
  // top-level
  classifyRepo,
  getRepoWeight,
  scoreDomains,
  scoreDomainsGuarded,
};
