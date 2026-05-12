// All domains the scoring pipeline can produce.
// Used for vector-based similarity — must stay in sync with ontology.js DOMAIN_RULES keys.
const ALL_DOMAINS = [
  "ai_ml", "genai", "agentic_ai",
  "frontend", "backend",
  "devops", "database", "systems",
  "mlops", "algorithms", "cybersecurity",
  "blockchain", "embedded", "data_science",
  "networking", "distributed_systems",
];

// Read a domain score from the root-level domainScores Map (covers ALL domains).
// Falls back to topDomains for profiles written before the domainScores field was added.
function getDomainScore(user, domain) {
  if (user.domainScores) {
    const score = user.domainScores instanceof Map
      ? user.domainScores.get(domain)
      : user.domainScores[domain];
    if (score !== undefined && score !== null) return score;
  }
  const entry = (user.topDomains || []).find(d => d.domain === domain);
  return entry ? (entry.score || 0) : 0;
}

// Build a normalised numeric vector from all domain scores.
// Vector direction encodes the full semantic profile for cosine similarity.
function buildVector(user) {
  const raw = ALL_DOMAINS.map(d => getDomainScore(user, d));
  const mag = Math.sqrt(raw.reduce((s, v) => s + v * v, 0));
  return mag === 0 ? raw : raw.map(v => v / mag);
}

function cosineSimilarity(vecA, vecB) {
  let dot = 0;
  for (let i = 0; i < vecA.length; i++) dot += vecA[i] * vecB[i];
  return dot; // vectors are pre-normalised
}

// "Teammate" reco — find users with similar domain profiles.
exports.getSimilarUsers = (currentUser, allUsers) => {
  const vecA = buildVector(currentUser);

  return allUsers
    .filter(u => u._id.toString() !== currentUser._id.toString())
    .map(u => ({ user: u, score: cosineSimilarity(vecA, buildVector(u)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
};

// "Complementary team" reco — find users who fill YOUR weakest domains.
exports.getComplementaryUsers = (currentUser, allUsers) => {
  const weakDomains = ALL_DOMAINS
    .map(d => ({ d, v: getDomainScore(currentUser, d) }))
    .sort((a, b) => a.v - b.v)
    .slice(0, 3)
    .map(x => x.d);

  return allUsers
    .filter(u => u._id.toString() !== currentUser._id.toString())
    .map(u => ({
      user:  u,
      score: weakDomains.reduce((sum, d) => sum + getDomainScore(u, d), 0),
      fills: weakDomains,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
};
