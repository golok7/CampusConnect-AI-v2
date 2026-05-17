const User                    = require("../models/User");
const { DOMAIN_INTEREST_MAP } = require("../constants/domains");
const { SKILL_WEIGHTS }       = require("../constants/skillWeights");
const { ALIAS_TO_CATEGORY }   = require("./skills/skillOntology");

// Skills sorted by breadth (category) then recruiter weight as tiebreaker.
// Languages/frameworks represent consistent usage; rare libraries should not
// dominate a summary just because they have high recruiter-discriminative weight.
const CATEGORY_PRIORITY = { languages: 1, frameworks: 2, databases: 3, libraries: 4, tools: 5 };

function sortByBreadth(skills) {
  return skills
    .map(s => ({
      skill:    s,
      weight:   SKILL_WEIGHTS[s] ?? 1.0,
      priority: CATEGORY_PRIORITY[ALIAS_TO_CATEGORY.get(s)] ?? 5,
    }))
    .sort((a, b) => a.priority !== b.priority ? a.priority - b.priority : b.weight - a.weight);
}

// ── Config ────────────────────────────────────────────────────────────────────
const TOP_DOMAINS      = 4;
const REPOS_PER_DOMAIN = 3;
const MIN_UNIQUE_REPOS = 10;
const DOMAIN_THRESHOLD = 5;

// ── buildDomainEvidence ───────────────────────────────────────────────────────
// "What kind of engineer IS this person?"
//
// Step 1 — top 4 domains by score (above threshold).
// Step 2 — per domain: top 3 repos that contribute meaningfully to the domain
//          (domains[domain] >= REPO_DOMAIN_THRESHOLD), sorted by that domain's
//          contribution score — not just repos where it is the dominant domain.
// Step 3 — deduplicate repos globally across domains.
// Step 4 — if total unique repos < MIN_UNIQUE_REPOS, fill from globally strongest.

const REPO_DOMAIN_THRESHOLD = 0.05; // repo must contribute at least this much to a domain

function getDomainScore(r, domain) {
  // domains is stored as a Mongoose Map; access via .get() or plain object key
  const d = r.domains;
  if (!d) return r.dominantDomain === domain ? (r.semanticScore || 0) : 0;
  return (typeof d.get === "function" ? d.get(domain) : d[domain]) || 0;
}

// Blended evidence score: semantic domain contribution + engineering depth signal.
// Depth ensures infra-heavy hybrid repos rank above simple single-purpose repos
// even when their domain contribution score is similar.
function evidenceScore(r, domain) {
  return 0.7 * getDomainScore(r, domain) + 0.3 * (r.depthScore || 0);
}

function buildDomainEvidence(user) {
  const repoSummaries = user.githubData?.repoSummaries || [];

  const topDomains = (user.topDomains || [])
    .filter(d => (d.score || 0) >= DOMAIN_THRESHOLD)
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, TOP_DOMAINS)
    .map(d => d.domain);

  const seenRepos      = new Set();
  const domainEvidence = {};
  let   totalDomainRepos = 0;

  for (const domain of topDomains) {
    const picks = [...repoSummaries]
      .filter(r => !seenRepos.has(r.repoName) && getDomainScore(r, domain) >= REPO_DOMAIN_THRESHOLD)
      .sort((a, b) => evidenceScore(b, domain) - evidenceScore(a, domain))
      .slice(0, REPOS_PER_DOMAIN);

    picks.forEach(r => seenRepos.add(r.repoName));
    totalDomainRepos += picks.length;
    domainEvidence[domain] = { topRepos: picks.map(r => r.repoName) };
  }

  // If domain evidence didn't yield enough repos overall, surface top 10 globally
  if (totalDomainRepos < MIN_UNIQUE_REPOS) {
    const top10 = [...repoSummaries]
      .filter(r => (r.semanticScore || 0) > 0)
      .sort((a, b) => (b.semanticScore || 0) - (a.semanticScore || 0))
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

  // Top 8 skills: broad categories first, weight as tiebreaker within each
  const strongest = sortByBreadth(user.normalizedSkills || [])
    .slice(0, 8)
    .map(({ skill }) => skill);

  return { byCategory, counts, strongest };
}

// ── buildContributionStats ────────────────────────────────────────────────────
// GitHub activity metrics + top repos for the profile header.

function buildContributionStats(user) {
  const gd = user.githubData || {};

  const topDomainNames = (user.topDomains || [])
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .map(d => d.domain);

  const ranked = (gd.repoSummaries || [])
    .filter(r => (r.semanticScore || 0) > 0)
    .sort((a, b) => (b.semanticScore || 0) - (a.semanticScore || 0));

  const seen  = new Set();
  const picks = [];

  // First pass: one best repo per top domain to ensure diversity
  for (const domain of topDomainNames) {
    if (picks.length >= 6) break;
    const repo = ranked.find(r => r.dominantDomain === domain && !seen.has(r.repoName));
    if (repo) { picks.push(repo); seen.add(repo.repoName); }
  }

  // Second pass: fill remaining slots from global top
  for (const repo of ranked) {
    if (picks.length >= 6) break;
    if (!seen.has(repo.repoName)) { picks.push(repo); seen.add(repo.repoName); }
  }

  const topRepos = picks.map(r => ({
    name:           r.repoName,
    dominantDomain: r.dominantDomain || null,
    semanticScore:  Math.round((r.semanticScore || 0) * 1000) / 1000,
    description:    r.description || null,
    url:            `https://github.com/${user.githubUsername}/${r.repoName}`,
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
  const sorted = (user.topDomains || [])
    .filter(d => (d.score || 0) >= DOMAIN_THRESHOLD)
    .sort((a, b) => (b.score || 0) - (a.score || 0));

  // devops is infrastructure support — if it lands in the top 2 title slots,
  // replace it with the next non-devops domain so the title reflects actual
  // engineering identity rather than tooling.
  const titleDomains = [];
  for (const d of sorted) {
    if (titleDomains.length === 2) break;
    if (d.domain === "devops" && titleDomains.length >= 1) continue;
    titleDomains.push(d);
  }

  const label = d => DOMAIN_INTEREST_MAP[d] || d;
  let summary =
    titleDomains.length >= 2 ? `${label(titleDomains[0].domain)} and ${label(titleDomains[1].domain)} engineer`
    : titleDomains.length === 1 ? `${label(titleDomains[0].domain)} engineer`
    : "Software engineer";

  const topSkills = sortByBreadth(user.normalizedSkills || [])
    .slice(0, 5)
    .map(({ skill }) =>
      skill.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
    );

  if (topSkills.length) summary += ` with experience in ${topSkills.join(", ")}.`;
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
      // Only need existence check — don't send full blob to frontend
      resumeData:                  1,
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
    hasResume:      !!user.resumeData,
  };
};
