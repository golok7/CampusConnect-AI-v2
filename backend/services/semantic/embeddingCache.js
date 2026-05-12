const fs     = require("fs");
const path   = require("path");
const crypto = require("crypto");

// Cache lives outside source tree so it is never committed.
const CACHE_FILE    = path.join(__dirname, "../../../cache/embeddings.json");
const MAX_REPO_ENTRIES = 600; // evict oldest when exceeded

let _mem = null; // in-process L1 — avoids repeated disk reads within a session

// ── Internal helpers ──────────────────────────────────────────────────────────

function load() {
  if (_mem) return;
  try {
    _mem = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
  } catch {
    _mem = { protoVersion: null, prototypes: {}, repos: {} };
  }
}

function save() {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(_mem));
  } catch (err) {
    console.warn(`[embed-cache] write failed: ${err.message}`);
  }
}

function hashText(text) {
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 20);
}

// ── Prototype cache ───────────────────────────────────────────────────────────

// Returns the stored prototype embedding dict for the given ontology version,
// or null if the cache is missing / stale.
function getPrototypes(version) {
  load();
  if (_mem.protoVersion !== version) return null;
  const domains = Object.keys(_mem.prototypes);
  if (domains.length === 0) return null;
  return _mem.prototypes;
}

// Persists a newly-computed prototype embedding dict.
function setPrototypes(version, data) {
  load();
  _mem.protoVersion = version;
  _mem.prototypes   = data;
  save();
}

// ── Repo summary cache ────────────────────────────────────────────────────────

// Returns the cached embedding vector for a given summary text, or null.
function getRepoVec(summaryText) {
  load();
  const entry = _mem.repos[hashText(summaryText)];
  return entry ? entry.vec : null;
}

// Stores fresh embedding vectors for a batch of summary texts.
// Evicts the oldest entries if the cache grows beyond MAX_REPO_ENTRIES.
function setRepoVecs(summaryTexts, vectors) {
  load();
  const now = Date.now();
  for (let i = 0; i < summaryTexts.length; i++) {
    _mem.repos[hashText(summaryTexts[i])] = { vec: vectors[i], ts: now };
  }

  // Evict oldest entries
  const entries = Object.entries(_mem.repos).sort((a, b) => a[1].ts - b[1].ts);
  while (entries.length > MAX_REPO_ENTRIES) {
    const [key] = entries.shift();
    delete _mem.repos[key];
  }

  save();
}

// Wipes only the repo embedding cache (prototype cache is preserved).
// Called when VOYAGE_BUST_REPO_CACHE=1 to force re-embedding and reveal summary text.
function clearRepos() {
  load();
  const before = Object.keys(_mem.repos).length;
  _mem.repos = {};
  save();
  console.log(`[embed-cache] repo cache cleared (${before} entries removed)`);
}

// ── Stats (for logging) ───────────────────────────────────────────────────────

function stats() {
  load();
  return {
    protoVersion: _mem.protoVersion,
    repoCacheSize: Object.keys(_mem.repos).length,
  };
}

module.exports = { getPrototypes, setPrototypes, getRepoVec, setRepoVecs, clearRepos, stats };
