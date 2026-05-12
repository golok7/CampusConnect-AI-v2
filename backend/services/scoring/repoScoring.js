// ================= REPO SCORING =================

// Exponential decay on last-push date: e^(-months/18), floor 0.3.
// An 18-month-old repo scores ~0.37; a 3-year-old repo scores ~0.30.
function repoRecencyScore(repo) {
  const pushed = repo.pushed_at ? new Date(repo.pushed_at) : null;
  if (!pushed) return 1.0;
  const monthsOld = (Date.now() - pushed.getTime()) / (1000 * 60 * 60 * 24 * 30.5);
  return Math.max(0.3, Math.exp(-monthsOld / 18));
}

// Lightweight pre-score — no commit data needed.
// Used to rank enrichment candidates (top 30) and as fallback for non-enriched repos.
function repoQualityScore(repo) {
  const stars    = Math.log2((repo.stargazers_count || 0) + 1);
  const forks    = Math.log2((repo.forks_count      || 0) + 1);
  const metadata = (repo.description ? 1 : 0) +
                   (repo.language    ? 1 : 0) +
                   ((repo.topics?.length || 0) > 0 ? 1 : 0);
  const homepage = repo.homepage ? 1 : 0;
  const recency  = repoRecencyScore(repo);
  return (stars * 3) + (forks * 2) + (metadata * 1.5) + (homepage * 1) + (recency * 3);
}

// Full project importance — requires contributor commit count from GitHub API.
// Weights (sum ~1.05 — absolute values, not a probability distribution):
//   commits 0.45 · recency 0.20 · metadata 0.15 · community 0.20 · ownership 0.05
function repoImportanceScore(repo, userCommits = 0) {
  // log2 scaling prevents commit spam from exploding; *2.5 keeps magnitude comparable to community.
  const commitScore = Math.log2(userCommits + 1) * 2.5;

  // Scale recency into [1.5, 5.0] so it competes with metadata and community signals.
  const recencyScore = repoRecencyScore(repo) * 5;

  // Topics proportional (capped at 5), plus binary description / language / homepage.
  const metadataScore = (repo.description ? 1 : 0) +
                        (repo.language    ? 1 : 0) +
                        Math.min((repo.topics?.length || 0) / 5, 1) +
                        (repo.homepage    ? 1 : 0);

  // Forks weighted more than stars — a fork takes deliberate action.
  const communityScore = Math.log2((repo.stargazers_count || 0) + 1) * 1.2 +
                         Math.log2((repo.forks_count      || 0) + 1) * 1.5;

  // Graduated fork penalty: light for active/starred forks, heavy for empty clones.
  let ownershipScore;
  if (!repo.fork) {
    ownershipScore = 1.0;
  } else if (userCommits >= 20 || (repo.stargazers_count || 0) >= 5) {
    ownershipScore = 0.75;
  } else {
    ownershipScore = 0.45;
  }

  return (
    commitScore    * 0.45 +
    recencyScore   * 0.20 +
    metadataScore  * 0.15 +
    communityScore * 0.20 +
    ownershipScore * 0.05
  );
}

// ── Fork-specific scoring ─────────────────────────────────────────────────────

// Adaptive multiplier: how much a fork counts relative to an owned repo.
// Graduated by commit depth — heavy contributors approach owned-repo weight.
function forkMultiplier(userCommits) {
  if (userCommits >= 50) return 0.95;
  if (userCommits >= 25) return 0.90;
  if (userCommits >= 10) return 0.80;
  if (userCommits >= 5)  return 0.65;
  return 0.35; // 1-4 commits with qualifying metadata — minimal weight
}

// Classifies forks into tiers used by the scoring pipeline.
//   "fork_contributor" — active contribution; scores with forkMultiplier
//   "passive_fork"     — drive-by clone with no signal; excluded entirely
//
// Inclusion criteria (ANY is sufficient):
//   - userCommits >= 5 (primary signal)
//   - 1+ commits with description or topics (low-weight contribution)
//   - starred + description (community-recognised with metadata)
function forkTier(repo, userCommits) {
  if (!repo.fork) return "owned";
  if (userCommits >= 5) return "fork_contributor";
  // 1-4 commits with metadata → evaluate at low weight (0.35×)
  if (userCommits >= 1 && (repo.description || (repo.topics?.length || 0) > 0)) return "fork_contributor";
  return "passive_fork";
}

// Full importance score for a fork that the user actively contributed to.
// Mirror of repoImportanceScore's structure, with commits weighted heavier
// and ownership penalty replaced by an adaptive fork multiplier.
function forkContributionScore(repo, userCommits = 0) {
  const commitScore = Math.log2(userCommits + 1) * 2.5;

  const recencyScore = repoRecencyScore(repo) * 5;

  const metadataScore = (repo.description ? 1 : 0) +
                        (repo.language    ? 1 : 0) +
                        Math.min((repo.topics?.length || 0) / 5, 1) +
                        (repo.homepage    ? 1 : 0);

  const communityScore = Math.log2((repo.stargazers_count || 0) + 1) * 1.2 +
                         Math.log2((repo.forks_count      || 0) + 1) * 1.5;

  const base = (
    commitScore    * 0.60 +
    recencyScore   * 0.15 +
    communityScore * 0.15 +
    metadataScore  * 0.10
  );

  return base * forkMultiplier(userCommits);
}

module.exports = {
  repoRecencyScore,
  repoQualityScore,
  repoImportanceScore,
  forkMultiplier,
  forkTier,
  forkContributionScore,
};
