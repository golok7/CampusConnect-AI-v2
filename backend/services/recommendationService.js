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

// Build a vector from a drive's domainScores
function buildDriveVector(drive) {
  const raw = ALL_DOMAINS.map(d => {
    if (drive.domainScores instanceof Map) return drive.domainScores.get(d) || 0;
    return drive.domainScores?.[d] || 0;
  });
  const mag = Math.sqrt(raw.reduce((s, v) => s + v * v, 0));
  return mag === 0 ? raw : raw.map(v => v / mag);
}

function toArray(val) {
  if (Array.isArray(val)) return val;
  if (!val) return [];
  if (val instanceof Set) return [...val];
  if (typeof val === "object") return Object.values(val).filter(v => typeof v === "string");
  return [];
}

// Extract skill keywords from a drive's JD description text by matching against
// the student's known skills — gives a JD-text-based overlap even when requiredSkills is empty.
function jdTextOverlap(drive, candidate) {
  const text = (drive.description || "").toLowerCase();
  if (!text) return 0;
  const candidateSkills = [
    ...toArray(candidate.normalizedSkills),
    ...toArray(candidate.resumeNormalizedSkills),
    ...toArray(candidate.skills),
  ].map(s => String(s).toLowerCase());
  if (candidateSkills.length === 0) return 0;
  const matched = candidateSkills.filter(s => s.length > 2 && text.includes(s)).length;
  return Math.min(matched / Math.max(candidateSkills.length * 0.3, 5), 1);
}

// Recommend active drives to a user
exports.getJobRecommendations = (currentUser, activeDrives) => {
  const vecA       = buildVector(currentUser);
  const hasProfile = vecA.some(v => v > 0);
  const activity   = Math.min((currentUser.activityScore || 0) / 100, 1);

  return activeDrives
    .map(drive => {
      try {
        const useSkillsFallback = isDriveVectorEmpty(drive);
        let score;

        if (useSkillsFallback) {
          const explicitOverlap = skillOverlapScore(drive, currentUser);
          const textOverlap     = jdTextOverlap(drive, currentUser);
          const skillScore      = Math.max(explicitOverlap, textOverlap);
          score = skillScore > 0
            ? skillScore * 0.65 + activity * 0.35
            : activity * 0.2;
        } else {
          const vecB        = buildDriveVector(drive);
          const domainScore = hasProfile ? cosineSimilarity(vecA, vecB) : 0;
          const textOverlap = jdTextOverlap(drive, currentUser);
          score = domainScore * 0.6 + textOverlap * 0.25 + activity * 0.15;
        }

        // Always return at least a base score so drives are visible even with no profile data
        return { drive, score: Math.max(score, 0.01) };
      } catch {
        return { drive, score: 0.01 };
      }
    })
    .sort((a, b) => b.score - a.score);
};

// Skill overlap score: fraction of drive's requiredSkills the candidate has
function skillOverlapScore(drive, candidate) {
  const required = toArray(drive.requiredSkills).map(s => String(s).toLowerCase());
  if (required.length === 0) return 0;
  const has = new Set([
    ...toArray(candidate.normalizedSkills),
    ...toArray(candidate.resumeNormalizedSkills),
    ...toArray(candidate.skills),
  ].map(s => String(s).toLowerCase()));
  const matched = required.filter(s => has.has(s)).length;
  return matched / required.length;
}

// Check if drive vector is effectively zero (no domain scores set)
function isDriveVectorEmpty(drive) {
  if (!drive.domainScores) return true;
  const scores = drive.domainScores instanceof Map
    ? [...drive.domainScores.values()]
    : Object.values(drive.domainScores);
  return scores.every(v => !v || v === 0);
}

// Rank candidates for a specific drive
exports.getRoleMatching = (drive, candidates) => {
  const useSkills = isDriveVectorEmpty(drive);
  const vecDrive  = useSkills ? null : buildDriveVector(drive);

  return candidates
    .map(candidate => {
      let score;
      if (useSkills) {
        // No domain profile on drive — use skill overlap + activity
        const overlap  = skillOverlapScore(drive, candidate);
        const activity = Math.min((candidate.activityScore || 0) / 100, 1);
        score = overlap * 0.7 + activity * 0.3;
      } else {
        const vecUser = buildVector(candidate);
        const domain  = cosineSimilarity(vecDrive, vecUser);
        const overlap = skillOverlapScore(drive, candidate);
        score = domain * 0.6 + overlap * 0.4;
      }
      return { candidate, score, fitScore: Math.round(score * 100) };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
};
