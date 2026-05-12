const { TOP_K_SEMANTIC, SOFTMAX_TEMP } = require("./voyageClient");
const { OVERLAP_DAMPENING, DOMAIN_RULES, DEP_MAP } = require("./ontology");
const { match } = require("../utils/textUtils");

// Keyword refinement boost magnitudes (keep small — Voyage is the primary signal).
const KW_META_BOOST   = 0.012;  // per keyword hit in repo name/description/topics
const KW_README_BOOST = 0.008;  // per keyword hit in README
const KW_DEP_BOOST    = 0.005;  // per DOMAIN_RULES keyword hit in dependency text
const KW_DEPMAP_BOOST = 0.018;  // per DEP_MAP specific package hit (most specific signal)
const KW_DOMAIN_CAP   = 0.12;   // max total keyword refinement per domain

// Allows keyword refinements to rescue a near-miss domain (rank 4+ but within epsilon of cutoff).
const SEMANTIC_RESCUE_EPS = 0.03;

// Converts an object of raw scores to a probability distribution via softmax.
// SOFTMAX_TEMP sharpens the distribution for Voyage's compressed similarity range (~0.24–0.55).
function softmax(scores) {
  const entries = Object.entries(scores);
  if (entries.length === 0) return {};
  const max  = Math.max(...entries.map(([, v]) => v));
  const exps = entries.map(([k, v]) => [k, Math.exp((v - max) / SOFTMAX_TEMP)]);
  const sum  = exps.reduce((s, [, e]) => s + e, 0);
  return Object.fromEntries(exps.map(([k, e]) => [k, e / sum]));
}

// Converts raw Voyage cosine similarities into a sharp semantic prior.
// Voyage embeddings are authoritative; keywords are refinement only.
function voyageToSemanticPrior(embSims) {
  if (!embSims) return {};

  const allSorted  = Object.entries(embSims).sort((a, b) => b[1] - a[1]);
  const hardCutoff = allSorted[TOP_K_SEMANTIC - 1]?.[1] ?? -Infinity;

  // Keep every domain within epsilon of the TOP_K cutoff to allow keyword rescue.
  const topEntries = allSorted
    .filter(([, s]) => s >= hardCutoff - SEMANTIC_RESCUE_EPS);

  return softmax(Object.fromEntries(topEntries));
}

// Measures how decisive the embedding result is using coefficient of variation
// of the top-K raw cosine similarities.
// CV (std/mean) directly measures spread: near-zero CV → uncertain; high CV → confident.
function computeEmbeddingConfidence(embSims) {
  const top = Object.values(embSims)
    .sort((a, b) => b - a)
    .slice(0, TOP_K_SEMANTIC);

  if (top.length < 2) return { confidence: 1.0, cv: 0, top, spreadPenalty: false };

  const mean = top.reduce((s, v) => s + v, 0) / top.length;
  if (mean < 1e-10) return { confidence: 0.35, cv: 0, top, spreadPenalty: false };

  const variance = top.reduce((s, v) => s + (v - mean) ** 2, 0) / top.length;
  const cv = Math.sqrt(variance) / mean;

  const CONF_FLOOR   = 0.35;
  const CV_FULL_CONF = 0.30;

  // Scale confidence down when max sim is below the target —
  // voyage-4-lite: strong match ~0.42+, noisy repos cluster ~0.25–0.30.
  const ABS_SIM_FLOOR  = 0.24;
  const ABS_SIM_TARGET = 0.42;
  const absStrength = Math.min(1.0, Math.max(0.6, (top[0] - ABS_SIM_FLOOR) / (ABS_SIM_TARGET - ABS_SIM_FLOOR)));

  const base = (CONF_FLOOR + (1 - CONF_FLOOR) * Math.min(1.0, cv / CV_FULL_CONF)) * absStrength;
  return { confidence: base, cv, top, maxSim: top[0] };
}

// Normalised Shannon entropy of the semantic prior (0 = certain, 1 = maximally flat).
// Entropy detects flat softmax distributions that CV may miss.
function computePriorEntropy(prior) {
  const values = Object.values(prior).filter(v => v > 0);
  if (values.length <= 1) return 0;
  const maxH = Math.log2(values.length);
  if (maxH === 0) return 0;
  const h = -values.reduce((s, p) => s + p * Math.log2(p + 1e-12), 0);
  return h / maxH;
}

// Returns tiny additive keyword refinement boosts — NOT the primary score.
function getKeywordRefinements(signals, deps) {
  const boosts = {};

  for (const [domain, keywords] of Object.entries(DOMAIN_RULES)) {
    let total = 0;
    for (const kw of keywords) {
      let kwBoost = 0;
      if (match(signals.metadata,     kw)) kwBoost += KW_META_BOOST;
      if (match(signals.readme,       kw)) kwBoost += KW_README_BOOST;
      if (match(signals.dependencies, kw)) kwBoost += KW_DEP_BOOST;
      if (kwBoost > 0) total += kwBoost;
    }
    if (total > 0) boosts[domain] = total;
  }

  // DEP_MAP specific package hits — slightly stronger than generic keyword matches.
  for (const [pkg, domain] of Object.entries(DEP_MAP)) {
    if (match(deps, pkg)) {
      boosts[domain] = (boosts[domain] || 0) + KW_DEPMAP_BOOST;
    }
  }

  // Cap per domain so keywords can never overwhelm Voyage's semantic prior.
  for (const d in boosts) {
    boosts[d] = Math.min(boosts[d], KW_DOMAIN_CAP);
  }

  return boosts;
}

// Adds keyword refinement boosts onto the semantic prior.
// Domains not in the prior can be introduced by keywords, but only at their tiny boost value.
function applyKeywordRefinements(semanticPrior, refinements) {
  const result = { ...semanticPrior };
  for (const [domain, boost] of Object.entries(refinements)) {
    result[domain] = (result[domain] || 0) + boost;
  }
  return result;
}

// Re-normalizes a domain probability dict to sum to 1 after refinements are applied.
function normalizeDomainProbabilities(probs) {
  const total = Object.values(probs).reduce((s, v) => s + v, 0);
  if (total === 0) return probs;
  return Object.fromEntries(Object.entries(probs).map(([k, v]) => [k, v / total]));
}

// Suppresses the lower-scoring member of each overlapping domain pair.
// Only fires when primary clearly outscores the neighbor — never reduces the dominant domain.
function applyOverlapDampening(domains) {
  const result = { ...domains };
  for (const [primary, neighbors] of Object.entries(OVERLAP_DAMPENING)) {
    if (!result[primary]) continue;
    for (const [neighbor, factor] of Object.entries(neighbors)) {
      if (!result[neighbor]) continue;
      if (result[primary] <= result[neighbor]) continue;
      result[neighbor] *= factor;
    }
  }
  return normalizeDomainProbabilities(result);
}

module.exports = {
  KW_META_BOOST,
  KW_README_BOOST,
  KW_DEP_BOOST,
  KW_DEPMAP_BOOST,
  KW_DOMAIN_CAP,
  softmax,
  voyageToSemanticPrior,
  computeEmbeddingConfidence,
  computePriorEntropy,
  getKeywordRefinements,
  applyKeywordRefinements,
  normalizeDomainProbabilities,
  applyOverlapDampening,
};
