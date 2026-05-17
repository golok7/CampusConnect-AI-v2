const { getUserPRStats, getRepoCollaboratorLogins } = require("./githubClient");

// ── Collaboration Intelligence ────────────────────────────────────────────────
//
// Computes PR quality, team contribution, and engineering consistency signals
// from GitHub data. Called once per GitHub sync.
//
// collaborationScore  (0–100): how much the user works with others
// teamworkScore       (0–100): quality of that collaboration (merge rate + PR engagement)

const MAX_COLLAB_REPOS = 6; // repos to check for collaborator data (rate-limit budget)

async function computeCollaborationData(username, allRepos, repoTypeCounts) {
  // ── PR stats (2 search API calls) ──────────────────────────────────────────
  const { totalPRs, mergedPRs } = await getUserPRStats(username);
  const mergeRate = totalPRs > 0 ? mergedPRs / totalPRs : 0;

  // ── Repos where user contributed as a non-owner (fork_contributor) ─────────
  const collaboratedRepos = repoTypeCounts?.fork ?? 0;

  // ── Unique collaborators on user's own project repos ──────────────────────
  // Limit to top MAX_COLLAB_REPOS to stay within rate-limit budget
  const projectRepos = allRepos
    .filter(r => !r.fork && r.name !== username) // own project repos, not the profile README
    .sort((a, b) => (b.stargazers_count + b.forks_count) - (a.stargazers_count + a.forks_count))
    .slice(0, MAX_COLLAB_REPOS);

  const collaboratorSets = await Promise.all(
    projectRepos.map(r => getRepoCollaboratorLogins(username, r.name)),
  );

  const uniqueCollaborators = new Set(collaboratorSets.flat()).size;

  // ── Scores (0–100) ────────────────────────────────────────────────────────
  // PR signal: sigmoid-like — 10 PRs ≈ 0.5, 30+ PRs ≈ 1.0
  const prSignal = Math.min(totalPRs / 30, 1);

  // Collaboration score: how broadly you work with others
  const collaborationScore = Math.round(
    (0.40 * Math.min(uniqueCollaborators / 8, 1)
    + 0.30 * Math.min(collaboratedRepos / 5, 1)
    + 0.30 * prSignal) * 100,
  );

  // Teamwork score: quality of collaboration (merge rate matters most)
  const teamworkScore = Math.round(
    (0.50 * mergeRate
    + 0.30 * prSignal
    + 0.20 * Math.min(uniqueCollaborators / 8, 1)) * 100,
  );

  return {
    totalPRs,
    mergedPRs,
    mergeRate:            Math.round(mergeRate * 100) / 100,
    collaboratedRepos,
    uniqueCollaborators,
    collaborationScore:   Math.min(collaborationScore, 100),
    teamworkScore:        Math.min(teamworkScore, 100),
  };
}

module.exports = { computeCollaborationData };
