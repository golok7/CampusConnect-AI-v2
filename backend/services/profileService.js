const User                    = require("../models/User");
const { DOMAIN_INTEREST_MAP } = require("../constants/domains");
const { SKILL_WEIGHTS }       = require("../constants/skillWeights");

// ── Config ────────────────────────────────────────────────────────────────────
const TOP_DOMAINS      = 4;
const REPOS_PER_DOMAIN = 3;
const MIN_UNIQUE_REPOS = 10;
const DOMAIN_THRESHOLD = 5;

// ── buildDomainEvidence ───────────────────────────────────────────────────────
// "What kind of engineer IS this person?"
//
// Step 1 — top 4 domains by score (above threshold).
// Step 2 — per domain: top 3 repos whose dominantDomain matches, by semanticScore.
// Step 3 — deduplicate repos globally across domains.
// Step 4 — if total unique repos < MIN_UNIQUE_REPOS, fill from globally strongest.

function buildDomainEvidence(user) {
  const repoSummaries = user.githubData?.repoSummaries || [];

  const topDomains = (user.topDomains || [])
    .filter(d => (d.score || 0) >= DOMAIN_THRESHOLD)
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, TOP_DOMAINS)
    .map(d => d.domain);

  const ranked = [...repoSummaries]
    .filter(r => (r.semanticScore || 0) > 0)
    .sort((a, b) => (b.semanticScore || 0) - (a.semanticScore || 0));

  const seenRepos      = new Set();
  const domainEvidence = {};
  let   totalDomainRepos = 0;

  for (const domain of topDomains) {
    const picks = ranked
      .filter(r => r.dominantDomain === domain && !seenRepos.has(r.repoName))
      .slice(0, REPOS_PER_DOMAIN);

    picks.forEach(r => seenRepos.add(r.repoName));
    totalDomainRepos += picks.length;
    domainEvidence[domain] = { topRepos: picks.map(r => r.repoName) };
  }

  // If domain evidence didn't yield enough repos overall, surface top 10 globally
  if (totalDomainRepos < MIN_UNIQUE_REPOS) {
    const top10 = ranked
      .slice(0, MIN_UNIQUE_REPOS)
      .map(r => r.repoName);
    domainEvidence._topRepos = { topRepos: top10 };
  }

  return { topDomains, domainEvidence };
}

// ── buildSkillEvidence ────────────────────────────────────────────────────────
// Structured skill breakdown by category + top skills ranked by recruiter weight.

function buildSkillEvidence(user) {
  const sk = user.skills || {};

  const byCategory = {
    languages:  sk.languages  || [],
    frameworks: sk.frameworks || [],
    libraries:  sk.libraries  || [],
    databases:  sk.databases  || [],
    tools:      sk.tools      || [],
  };

  const counts = Object.fromEntries(
    Object.entries(byCategory).map(([cat, arr]) => [cat, arr.length])
  );

  // Top 8 skills by recruiter-discriminative weight
  const strongest = (user.normalizedSkills || [])
    .map(s => ({ skill: s, weight: SKILL_WEIGHTS[s] ?? 1.0 }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 8)
    .map(({ skill }) => skill);

  return { byCategory, counts, strongest };
}

// ── buildContributionStats ────────────────────────────────────────────────────
// GitHub activity metrics + top repos for the profile header.

function buildContributionStats(user) {
  const gd = user.githubData || {};

  const topRepos = (gd.repoSummaries || [])
    .filter(r => (r.semanticScore || 0) > 0)
    .sort((a, b) => (b.semanticScore || 0) - (a.semanticScore || 0))
    .slice(0, 6)
    .map(r => ({
      name:           r.repoName,
      dominantDomain: r.dominantDomain || null,
      semanticScore:  Math.round((r.semanticScore || 0) * 1000) / 1000,
    }));

  return {
    totalRepos:    gd.totalRepos    || 0,
    totalStars:    gd.stars         || 0,
    totalCommits:  gd.totalCommits  || 0,
    activityScore: Math.round((user.activityScore || 0) * 100) / 100,
    repoTypeCounts: gd.repoTypeCounts || {},
    topRepos,
  };
}

// ── buildProfileSummary ───────────────────────────────────────────────────────

function buildProfileSummary(user) {
  const topTwo = (user.topDomains || [])
    .filter(d => (d.score || 0) >= DOMAIN_THRESHOLD)
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 2);

  const label = d => DOMAIN_INTEREST_MAP[d] || d;
  let summary =
    topTwo.length >= 2 ? `${label(topTwo[0].domain)} and ${label(topTwo[1].domain)} engineer`
    : topTwo.length === 1 ? `${label(topTwo[0].domain)} engineer`
    : "Software engineer";

  const topSkills = (user.normalizedSkills || [])
    .map(s => ({ skill: s, weight: SKILL_WEIGHTS[s] ?? 1.0 }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map(({ skill }) =>
      skill.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
    );

  if (topSkills.length) summary += ` with hands-on experience in ${topSkills.join(", ")}.`;
  else summary += ".";

  return summary;
}

// ── getProfile ────────────────────────────────────────────────────────────────

exports.getProfile = async (githubUsername) => {
  const user = await User.findOne(
    { githubUsername },
    {
      name:             1,
      githubUsername:   1,
      branch:           1,
      year:             1,
      role:             1,
      interests:        1,
      skills:           1,
      normalizedSkills: 1,
      topDomains:       1,
      domainScores:     1,
      activityScore:    1,
      "githubData.repoSummaries":  1,
      "githubData.totalRepos":     1,
      "githubData.stars":          1,
      "githubData.totalCommits":   1,
      "githubData.repoTypeCounts": 1,
    }
  ).lean();

  if (!user) return null;

  const { topDomains, domainEvidence } = buildDomainEvidence(user);
  const skillEvidence       = buildSkillEvidence(user);
  const contributionStats   = buildContributionStats(user);
  const profileSummary      = buildProfileSummary(user);

  return {
    _id:            user._id,
    name:           user.name,
    githubUsername: user.githubUsername,
    branch:         user.branch,
    year:           user.year,
    role:           user.role,
    interests:      user.interests,
    topDomains:     user.topDomains,
    profileSummary,
    skillEvidence,
    domainEvidence: { topDomains, domainEvidence },
    contributionStats,
  };
};
