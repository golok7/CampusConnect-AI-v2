const Job  = require("../models/Job");
const { parseJDQuery } = require("./jdQueryParser");

const ALL_DOMAINS = [
  "ai_ml", "genai", "agentic_ai",
  "frontend", "backend",
  "devops", "database", "systems",
  "mlops", "algorithms", "cybersecurity",
  "blockchain", "embedded", "data_science",
  "networking", "distributed_systems", "data_engineering",
];

// ── Vector helpers ────────────────────────────────────────────────────────────

function getDomainScore(user, domain) {
  if (user.domainScores) {
    const score = user.domainScores instanceof Map
      ? user.domainScores.get(domain)
      : user.domainScores[domain];
    if (score != null) return score;
  }
  const entry = (user.topDomains || []).find(d => d.domain === domain);
  return entry ? (entry.score || 0) : 0;
}

function buildCandidateVector(user) {
  const raw = ALL_DOMAINS.map(d => getDomainScore(user, d));
  const mag = Math.sqrt(raw.reduce((s, v) => s + v * v, 0));
  return mag === 0 ? raw : raw.map(v => v / mag);
}

function buildJobVector(job) {
  const raw = ALL_DOMAINS.map(d => {
    const v = job.domainVector instanceof Map
      ? (job.domainVector.get(d) ?? 0)
      : (job.domainVector?.[d] ?? 0);
    return v;
  });
  const mag = Math.sqrt(raw.reduce((s, v) => s + v * v, 0));
  return mag === 0 ? raw : raw.map(v => v / mag);
}

function dotProduct(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

// ── Skill overlap score ───────────────────────────────────────────────────────

function computeSkillOverlap(user, job) {
  const candidateSkills = new Set([
    ...(user.normalizedSkills       || []),
    ...(user.resumeNormalizedSkills || []),
  ]);

  const required  = job.requiredSkills  || [];
  const preferred = job.preferredSkills || [];

  if (!required.length && !preferred.length) return { score: 0.5, matched: [], missing: [] };

  const matchedRequired  = required.filter(s  => candidateSkills.has(s.toLowerCase()));
  const matchedPreferred = preferred.filter(s => candidateSkills.has(s.toLowerCase()));
  const missing          = required.filter(s  => !candidateSkills.has(s.toLowerCase()));

  const reqScore  = required.length  ? matchedRequired.length  / required.length  : 1;
  const prefScore = preferred.length ? matchedPreferred.length / preferred.length : 0;

  // Required skills count 70%, preferred 30%
  const score = 0.7 * reqScore + 0.3 * prefScore;

  return {
    score,
    matched: [...matchedRequired, ...matchedPreferred],
    missing,
  };
}

// ── Score a single job for a candidate ───────────────────────────────────────
// Weights: 55% domain similarity, 35% skill overlap, 10% activity signal

function scoreJob(candidateVec, user, job) {
  const jobVec      = buildJobVector(job);
  const domainSim   = dotProduct(candidateVec, jobVec);
  const { score: skillScore, matched, missing } = computeSkillOverlap(user, job);
  const actNorm     = Math.min((user.activityScore || 0) / 200, 1); // normalize ~0-1

  const finalScore  = 0.55 * domainSim + 0.35 * skillScore + 0.10 * actNorm;

  return { finalScore, domainSim, skillScore, matched, missing };
}

// ── Recommend jobs for a user ─────────────────────────────────────────────────

async function recommendJobs(user, { limit = 10, type = null } = {}) {
  const filter = { active: true };
  if (type) filter.type = type;

  const jobs = await Job.find(filter).lean();
  if (!jobs.length) return [];

  const candidateVec = buildCandidateVector(user);

  const scored = jobs.map(job => {
    const { finalScore, domainSim, skillScore, matched, missing } = scoreJob(candidateVec, user, job);
    return {
      job: {
        _id:             job._id,
        title:           job.title,
        company:         job.company,
        type:            job.type,
        location:        job.location,
        stipend:         job.stipend,
        duration:        job.duration,
        deadline:        job.deadline,
        applyLink:       job.applyLink,
        requiredSkills:  job.requiredSkills,
        preferredSkills: job.preferredSkills,
        requiredDomains: job.requiredDomains,
        description:     job.description.slice(0, 300),
      },
      matchScore:    Math.round(finalScore  * 100),
      domainFit:     Math.round(domainSim   * 100),
      skillFit:      Math.round(skillScore  * 100),
      matchedSkills: matched,
      missingSkills: missing,
    };
  });

  return scored
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}

// ── Post a job (parses JD to populate domainVector + requiredSkills) ──────────

async function postJob(recruiterId, jobData) {
  const { title, company, description, location, type, stipend, duration, applyLink, deadline } = jobData;

  // Parse JD to extract skills and domain vector automatically
  let requiredSkills = jobData.requiredSkills || [];
  let domainVector   = {};

  try {
    const parsed = await parseJDQuery(description);
    if (!requiredSkills.length) requiredSkills = parsed.skills || [];
    domainVector = parsed.domainRelevance || {};
  } catch {
    // If JD parsing fails, fall back to manually provided skills
  }

  const job = await Job.create({
    postedBy:        recruiterId,
    title,
    company,
    description,
    location:        location || "Remote",
    type:            type     || "internship",
    requiredSkills,
    preferredSkills: jobData.preferredSkills || [],
    requiredDomains: jobData.requiredDomains || [],
    domainVector,
    stipend,
    duration,
    applyLink,
    deadline:        deadline ? new Date(deadline) : undefined,
    active:          true,
  });

  return job;
}

module.exports = { recommendJobs, postJob };
