const User = require("../models/User");
const { fetchGithubData } = require("../services/githubService");
const { computeCollaborationData } = require("../services/github/collaborationService");
const { AI_FAMILY, TOP_N, AI_MAX, DOMAIN_INTEREST_MAP } = require("../constants/domains");

const GITHUB_USERNAME_REGEX = /^[a-zA-Z0-9-]{1,39}$/;

const TOP_N_DOMAINS = TOP_N;
const AI_FAMILY_MAX = AI_MAX;

// Request deduplication map to prevent multiple simultaneous requests for the same user
const githubRequestMap = new Map();
// Request timeout: 2 minutes
const REQUEST_TIMEOUT_MS = 2 * 60 * 1000;

/**
 * Selects the top TOP_N_DOMAINS from allSortedDomains applying diversity.
 * allSortedDomains — [[domain, score], ...] sorted descending.
 * Returns an array of domain name strings (up to TOP_N_DOMAINS).
 */
function selectDiverseTopDomains(allSortedDomains) {
  const qualifying = allSortedDomains.filter(([, score]) => score > 0);

  const selected  = [];
  const aiOverflow = [];   // AI domains bumped by the cap
  let aiCount = 0;

  for (const [domain] of qualifying) {
    if (selected.length >= TOP_N_DOMAINS) break;

    if (AI_FAMILY.has(domain)) {
      if (aiCount >= AI_FAMILY_MAX) { aiOverflow.push(domain); continue; }
      aiCount++;
    }

    selected.push(domain);
  }

  // If slots remain and only AI domains are left, fill them (pure AI researcher).
  if (selected.length < TOP_N_DOMAINS && aiOverflow.length > 0) {
    selected.push(...aiOverflow.slice(0, TOP_N_DOMAINS - selected.length));
  }

  return selected;
}

// Cleanup function to remove expired requests from the map
function cleanupRequestMap() {
  const now = Date.now();
  for (const [key, { timestamp }] of githubRequestMap.entries()) {
    if (now - timestamp > REQUEST_TIMEOUT_MS) {
      githubRequestMap.delete(key);
    }
  }
}

// Run cleanup every 30 seconds
setInterval(cleanupRequestMap, 30 * 1000);

// ── Controller ────────────────────────────────────────────────────────────────
exports.getGithubData = async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ message: "GitHub username is required" });
    }
    if (!GITHUB_USERNAME_REGEX.test(username)) {
      return res.status(400).json({ message: "Invalid GitHub username format" });
    }

    // Check if GitHub token is configured
    if (!process.env.GITHUB_TOKEN || process.env.GITHUB_TOKEN.trim() === '') {
      return res.status(500).json({ message: 'GitHub token is not configured on the server. Please set GITHUB_TOKEN in the environment.' });
    }

    // Check if we have a pending request for this username
    const cacheKey = `github_${username}`;
    const existingRequest = githubRequestMap.get(cacheKey);
    
    // If there's an existing request that's not too old, wait for it
    if (existingRequest && Date.now() - existingRequest.timestamp < REQUEST_TIMEOUT_MS) {
      // Wait for the existing promise to resolve
      return existingRequest.promise;
    }
    
    // Create a new promise for this request
    const promise = (async () => {
      try {
        // ── Fetch + score from GitHub (and Voyage AI if key is set) ──
        const data = await fetchGithubData(username);

        if (!data.totalRepos || data.totalRepos === 0) {
          return res.status(400).json({
            message: "This GitHub account has no public repositories yet.",
          });
        }

        // ── Build diverse top 5 domain names ──
        const allSortedDomains     = Object.entries(data.skills).sort((a, b) => b[1] - a[1]);
        const diverseTopDomainNames = selectDiverseTopDomains(allSortedDomains);

        // ── Build rich topDomains array with scores and per-domain metrics ──
        const richTopDomains = diverseTopDomainNames.map(domain => ({
          domain,
          score:   data.skills[domain] || 0,
          metrics: data.domainMetrics?.[domain] || { repos: 0, commits: 0, stars: 0, activeDays: 0 },
        }));

        // ── Seed interests from top domain names ──
        // Re-seeded on every fetch so interests always reflect current work.
        const seededInterests = diverseTopDomainNames
          .map(d => DOMAIN_INTEREST_MAP[d])
          .filter(Boolean);

        // ── Build raw skills object ──
        const skills = {
          languages:  data.rawSkills?.languages  || data.languages || [],
          frameworks: data.rawSkills?.frameworks || [],
          libraries:  data.rawSkills?.libraries  || [],
          databases:  data.rawSkills?.databases  || [],
          tools:      data.rawSkills?.tools      || [],
        };

        const normalizedSkills = [...new Set([
          ...skills.languages,
          ...skills.frameworks,
          ...skills.libraries,
          ...skills.databases,
          ...skills.tools,
        ].map(s => s.toLowerCase().trim()).filter(Boolean))];

        const repoSummaries = data.repoSummaries || [];

        // ── Collaboration intelligence (non-blocking — runs in parallel with DB write) ──
        let collaborationData = {};
        try {
          collaborationData = await computeCollaborationData(
            username,
            data.allRepos || [],
            data.repoTypeCounts || {},
          );
        } catch (collabErr) {
          console.warn("[github] collaboration scoring failed (non-fatal):", collabErr.message);
        }

        // ── Persist to DB ──
        const user = await User.findByIdAndUpdate(
          req.user.id,
          {
            githubUsername:  username,
            topDomains:      richTopDomains,
            domainScores:    data.skills || {},
            skills,
            normalizedSkills,
            interests:       seededInterests,
            activityScore:   data.activityScore,
            githubData: {
              languages:         data.languages,
              repos:             data.repos,
              stars:             data.stars,
              totalRepos:        data.totalRepos,
              processedRepos:    data.processedRepos,
              totalCommits:      data.totalCommits || 0,
              repoTypeCounts:    data.repoTypeCounts,
              repoSummaries,
              activityScore:   data.activityScore,
              teamworkScore:   collaborationData.teamworkScore || 0,
              scoringMode:     data.embeddingMode,
              semanticVersion: "v1",
              domainScores:    data.skills || {},
              collaborationData,
            },
          },
          { returnDocument: "after" }
        );

        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        const safeUser = user.toJSON();
        delete safeUser.password;

        const response = { ...safeUser };
        if (process.env.NODE_ENV !== "production" || process.env.DEBUG_SEMANTICS === "true") {
          response.debug = {
            githubUsername:    username,
            finalDomainScores: data.skills || {},
            repos:             data.repoDebug || [],
          };
        }
        
        return res.json(response);
      } catch (err) {
        console.error("GitHub fetch error:", err.message);

        if (err.message?.includes("rate limit")) {
          return res.status(429).json({ message: `GitHub API ${err.message}` });
        }
        if (err.message?.includes("Bad credentials") || err.message?.includes("invalid") || err.message?.includes("expired")) {
          return res.status(401).json({ message: 'GitHub token is invalid or expired. Please check your GITHUB_TOKEN environment variable.' });
        }
        if (err.message?.includes("access denied") || err.message?.includes("403")) {
          return res.status(403).json({ message: err.message });
        }
        if (err.message?.includes("VOYAGE_API_KEY")) {
          console.warn("Voyage AI key missing — scoring ran in keyword-only mode.");
        }

        return res.status(500).json({ message: err.message || "GitHub fetch failed" });
      }
    })();
    
    // Store the promise in the map with a timestamp
    githubRequestMap.set(cacheKey, {
      promise,
      timestamp: Date.now()
    });
    
    // Remove the promise from the map when it settles (either fulfills or rejects)
    promise.finally(() => {
      githubRequestMap.delete(cacheKey);
    });
    
    // Wait for the promise to resolve and return its result
    return promise;
  } catch (err) {
    // This catches any synchronous errors that happen before the async function is called
    console.error("GitHub controller error:", err.message);
    return res.status(500).json({ message: err.message || "GitHub fetch failed" });
  }
};
