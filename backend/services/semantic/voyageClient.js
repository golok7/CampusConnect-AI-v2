const axios  = require("axios");
const { DOMAIN_PROTOTYPES, DOMAIN_DESC_VERSION } = require("./ontology");
const cache  = require("./embeddingCache");

// Set VOYAGE_BUST_REPO_CACHE=1 in .env to wipe stale repo embeddings on the next
// request and force the [summary:N] debug lines to print. Remove after one run.
if (process.env.VOYAGE_BUST_REPO_CACHE === "1") cache.clearRepos();

const VOYAGE_API   = "https://api.voyageai.com/v1/embeddings";
const VOYAGE_MODEL = "voyage-4-lite";

// How many top Voyage domains to keep before softmax.
// 5 ensures heterogeneous domains like backend (which often ranks 3rd-5th) are
// not truncated before softmax runs. Pure domains (algorithms, cybersecurity)
// still win on cosine strength, not by eliminating competitors early.
const TOP_K_SEMANTIC = 5;

// Temperature for the semantic prior softmax.
// Voyage cosine similarities are compressed into ~0.24–0.55. At 0.030 a tiny
// 0.010 gap → exp(-0.010/0.030)≈0.72 — very sharp, over-amplifying pure domains.
// At 0.045 the same gap → exp(-0.010/0.045)≈0.80 — still decisive but less
// winner-take-all; heterogeneous production repos retain proportional mass.
const SOFTMAX_TEMP = 0.045;

// With 3 RPM, each request must be at least 20 s apart. Use 25 s as floor.
const VOYAGE_RETRY_FLOOR_MS = 25_000;
const VOYAGE_MAX_RETRIES    = 3;

let _domainEmbeddings    = null; // in-process L1 cache
let _domainEmbeddingsVer = null;

// ── Helpers ───────────────────────────────────────────────────────────────────

function cosineSimilarity(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na  += a[i] * a[i];
    nb  += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-10);
}

// Computes { domain: avgTop2Sim } for one repo vector against all prototype vectors.
function computeSims(repoVec, domainEmbeddings) {
  const sims = {};
  for (const [domain, protoVecs] of Object.entries(domainEmbeddings)) {
    const protos = DOMAIN_PROTOTYPES[domain] || [];
    const scored = protoVecs
      .map((pv, idx) => ({ sim: cosineSimilarity(repoVec, pv), proto: protos[idx] || `proto-${idx}` }))
      .sort((a, b) => b.sim - a.sim);
    // Average top-2: requires broader semantic agreement than a single max.
    sims[domain] = scored.length >= 2 ? (scored[0].sim + scored[1].sim) / 2 : scored[0].sim;
  }
  return sims;
}

// ── Raw API call with retry ───────────────────────────────────────────────────

// Makes a single Voyage embed request with exponential-backoff retry.
// Respects retry-after header; falls back to VOYAGE_RETRY_FLOOR_MS (25 s) minimum.
async function callVoyageAPI(texts, inputType = "query") {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) throw new Error("VOYAGE_API_KEY not set in .env");

  let res;
  for (let attempt = 0; attempt <= VOYAGE_MAX_RETRIES; attempt++) {
    try {
      res = await axios.post(
        VOYAGE_API,
        { input: texts, model: VOYAGE_MODEL, input_type: inputType },
        {
          headers: {
            Authorization:  `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          timeout: 30_000,
        }
      );
      break;
    } catch (err) {
      if (err.response?.status === 429 && attempt < VOYAGE_MAX_RETRIES) {
        const retryAfterSec = parseInt(err.response.headers["retry-after"] || "0", 10);
        const delay = retryAfterSec > 0
          ? retryAfterSec * 1000
          : Math.max(VOYAGE_RETRY_FLOOR_MS, 5_000 * Math.pow(2, attempt));
        console.warn(`[voyage] 429 rate limited — retry ${attempt + 1}/${VOYAGE_MAX_RETRIES} in ${(delay / 1000).toFixed(1)}s`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw err;
      }
    }
  }

  return res.data.data.map(item => item.embedding);
}

// ── Domain prototype embeddings ───────────────────────────────────────────────

// Returns { domain: Vector[] } for all prototypes.
// Load order: in-process L1 → disk cache → Voyage API (one-time per version).
async function getDomainEmbeddings() {
  // L1: same process, already loaded
  if (_domainEmbeddings && _domainEmbeddingsVer === DOMAIN_DESC_VERSION) return _domainEmbeddings;

  // L2: disk cache — avoids re-embedding on every restart
  const diskCached = cache.getPrototypes(DOMAIN_DESC_VERSION);
  if (diskCached) {
    _domainEmbeddings    = diskCached;
    _domainEmbeddingsVer = DOMAIN_DESC_VERSION;
    console.log(`[voyage] domain prototypes loaded from disk cache (${DOMAIN_DESC_VERSION})`);
    return _domainEmbeddings;
  }

  // L3: call Voyage API (first run, or after ontology version bump)
  const entries = [];
  for (const [domain, protos] of Object.entries(DOMAIN_PROTOTYPES)) {
    for (const proto of protos) entries.push({ domain, proto });
  }
  const texts    = entries.map(e => e.proto);
  const nDomains = Object.keys(DOMAIN_PROTOTYPES).length;
  console.log(`[voyage] embedding ${texts.length} domain prototypes (${nDomains} domains) — one-time cost`);

  const vectors = await callVoyageAPI(texts, "document");

  _domainEmbeddings    = {};
  _domainEmbeddingsVer = DOMAIN_DESC_VERSION;
  vectors.forEach((vec, i) => {
    const { domain } = entries[i];
    if (!_domainEmbeddings[domain]) _domainEmbeddings[domain] = [];
    _domainEmbeddings[domain].push(vec);
  });

  cache.setPrototypes(DOMAIN_DESC_VERSION, _domainEmbeddings);
  console.log(`[voyage] ${texts.length} prototypes across ${Object.keys(_domainEmbeddings).length} domains cached to disk`);
  return _domainEmbeddings;
}

// ── Batch repo embedding ──────────────────────────────────────────────────────

// Embeds an array of semantic summary strings against all domain prototypes.
// Cache-aware: only calls Voyage for summaries not already in the disk cache.
// Returns null on hard failure (caller falls back to keyword-only scoring).
async function batchEmbedSummaries(summaries) {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) return null;

  try {
    const domainEmbeddings = await getDomainEmbeddings();

    // Split into cached and uncached
    const vectors     = summaries.map(s => cache.getRepoVec(s));
    const uncachedIdx = vectors.reduce((acc, v, i) => { if (v === null) acc.push(i); return acc; }, []);

    if (uncachedIdx.length === 0) {
      console.log(`[voyage] all ${summaries.length} repo embeddings served from cache — 0 API calls`);
    } else {
      const uncachedTexts = uncachedIdx.map(i => summaries[i]);
      for (let i = 0; i < uncachedTexts.length; i++) {
        console.log(`\n[summary:${uncachedIdx[i]}]\n${uncachedTexts[i]}\n`);
      }
      console.log(`[voyage] embedding ${uncachedTexts.length}/${summaries.length} uncached summaries (${summaries.length - uncachedTexts.length} from cache)`);

      const freshVecs = await callVoyageAPI(uncachedTexts, "query");

      // Persist fresh vectors
      cache.setRepoVecs(uncachedTexts, freshVecs);

      // Merge back into position-aligned array
      uncachedIdx.forEach((origIdx, freshIdx) => {
        vectors[origIdx] = freshVecs[freshIdx];
      });
    }

    return vectors.map(vec => ({ sims: computeSims(vec, domainEmbeddings) }));

  } catch (err) {
    console.warn(`[voyage] embedding failed — falling back to keyword-only. Error: ${err.message}`);
    return null;
  }
}

module.exports = {
  VOYAGE_API,
  VOYAGE_MODEL,
  TOP_K_SEMANTIC,
  SOFTMAX_TEMP,
  cosineSimilarity,
  computeSims,
  callVoyageAPI,
  getDomainEmbeddings,
  batchEmbedSummaries,
};
