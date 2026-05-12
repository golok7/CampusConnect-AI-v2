const User = require("../models/User");

function computeLeaderboardScore(user) {
  const activityScore = user.activityScore || 0;
  const domains       = user.topDomains || [];
  const github        = user.githubData || {};

  // Weighted skillDepth: top domain is worth most (decay across positions).
  // Rewards deep specialisation over a uniformly spread profile.
  const skillDepth = domains.reduce((sum, d, idx) => {
    const weight = ([1, 0.8, 0.6, 0.45, 0.3][idx] ?? 0.2);
    return sum + (d.score || 0) * weight;
  }, 0);

  // domainBreadth: relative to the user's own top domain score,
  // not an arbitrary absolute threshold.
  const maxDomainScore = Math.max(...domains.map(d => d.score || 0), 0);
  const domainBreadth  = domains.filter(d => (d.score || 0) >= maxDomainScore * 0.35).length;

  const repoCount = github.totalRepos || 0;

  // Contribution quality — currently 0 until githubService populates per-repo metrics.
  // log1p prevents score explosion once real commit/star/PR data is available.
  const rawContrib =
    (github.totalCommits || 0) * 0.35 +
    (github.activeDays   || 0) * 0.30 +
    (github.stars        || 0) * 0.20 +
    (github.totalPRs     || 0) * 0.15;
  const contributionQuality = Math.log1p(rawContrib);

  return Math.round((
    activityScore       * 0.40 +
    skillDepth          * 0.35 +
    domainBreadth       * 4    +
    contributionQuality * 0.15 +
    repoCount           * 0.10
  ) * 10) / 10;
}

exports.getLeaderboard = async () => {
  const users = await User.find(
    { githubUsername: { $exists: true, $ne: null } },
    { name: 1, githubUsername: 1, githubData: 1, topDomains: 1, activityScore: 1, branch: 1, year: 1 }
  );

  return users
    .map(user => ({
      name:             user.name,
      githubUsername:   user.githubUsername,
      branch:           user.branch,
      year:             user.year,
      topDomains:       user.topDomains || [],
      totalRepos:       user.githubData?.totalRepos || 0,
      activityScore:    Math.round((user.activityScore || 0) * 10) / 10,
      leaderboardScore: computeLeaderboardScore(user),
    }))
    .sort((a, b) => b.leaderboardScore - a.leaderboardScore)
    .map((user, index) => ({ rank: index + 1, ...user }));
};
