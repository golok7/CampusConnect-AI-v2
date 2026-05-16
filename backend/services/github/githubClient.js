const axios = require("axios");
const { cleanText, isBoilerplateDeps } = require("../utils/textUtils");

const MAX_PAGES    = 10;
const ENRICH_LIMIT = 30;

function githubHeaders() {
  const headers = { Accept: "application/vnd.github.v3+json" };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

async function safeGet(url, headers) {
  try {
    const res = await axios.get(url, { headers });
    const remaining = res.headers["x-ratelimit-remaining"];
    if (remaining !== undefined && parseInt(remaining, 10) < 50) {
      console.warn(`[github] rate limit low: ${remaining} requests remaining`);
    }
    return res;
  } catch (err) {
    const status = err.response?.status;

    if (status === 401) {
      console.error("[github] 401 — token invalid or expired");
      throw new Error("GitHub token is invalid or expired. Generate a new token at https://github.com/settings/tokens");
    }

    if (status === 403) {
      const body    = err.response?.data;
      const message = typeof body === "object" ? body?.message : body;
      const reset   = err.response?.headers["x-ratelimit-reset"];
      const resetTime = reset ? new Date(reset * 1000).toLocaleTimeString() : "unknown";
      const remaining = err.response?.headers["x-ratelimit-remaining"];

      // GitHub returns 403 for rate limit when remaining = 0
      if (remaining === "0" || message?.toLowerCase().includes("rate limit")) {
        console.error(`[github] rate limit exhausted. Resets at ${resetTime}`);
        throw new Error(`rate limit — resets at ${resetTime}. Make sure GITHUB_TOKEN is set in .env and server was restarted.`);
      }

      // 403 for other reasons (token missing scope, private repo, etc.)
      console.error(`[github] 403 forbidden: ${message}`);
      throw new Error(`GitHub access denied (403): ${message || "token may lack required permissions"}`);
    }

    if (status === 429) {
      const reset = err.response?.headers["x-ratelimit-reset"];
      const resetTime = reset ? new Date(reset * 1000).toLocaleTimeString() : "unknown";
      console.error(`[github] secondary rate limit. Resets at ${resetTime}`);
      throw new Error(`rate limit — secondary rate limit hit. Resets at ${resetTime}`);
    }

    throw err;
  }
}

// Checks current rate limit status without consuming any API quota.
async function getRateLimit() {
  try {
    const res = await axios.get("https://api.github.com/rate_limit", { headers: githubHeaders() });
    return res.data;
  } catch (err) {
    if (err.response?.status === 401) throw new Error("GitHub token invalid or expired");
    throw err;
  }
}

async function getAllRepos(username) {
  let page     = 1;
  let allRepos = [];
  while (page <= MAX_PAGES) {
    const res = await safeGet(
      `https://api.github.com/users/${username}/repos?per_page=100&page=${page}`,
      githubHeaders()
    );
    if (res.data.length === 0) break;
    allRepos.push(...res.data);
    page++;
  }
  console.log(`[github] TOTAL fetched: ${allRepos.length} repos for "${username}"`);
  return allRepos;
}

async function getReadme(owner, repo) {
  try {
    const res = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/readme`,
      {
        headers: {
          Accept: "application/vnd.github.v3.raw",
          ...(process.env.GITHUB_TOKEN && {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          }),
        },
      }
    );
    return cleanText(res.data);
  } catch {
    return "";
  }
}

// Fetches the profile README (username/username repo) as RAW markdown so badge
// alt-text and tech-section structure are preserved for skill extraction.
async function getProfileReadme(username) {
  try {
    const res = await axios.get(
      `https://api.github.com/repos/${username}/${username}/readme`,
      {
        headers: {
          Accept: "application/vnd.github.v3.raw",
          ...(process.env.GITHUB_TOKEN && {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          }),
        },
      }
    );
    return typeof res.data === "string" ? res.data : "";
  } catch {
    return "";
  }
}

async function getDependencies(owner, repo) {
  let text = "";
  const files = [
    "package.json",
    "requirements.txt",
    "pyproject.toml",
    "go.mod",
    "Cargo.toml",
    "pom.xml",
    "build.gradle",
  ];

  await Promise.all(
    files.map(async (file) => {
      try {
        const res = await axios.get(
          `https://api.github.com/repos/${owner}/${repo}/contents/${file}`,
          {
            headers: {
              Accept: "application/vnd.github.v3+json",
              ...(process.env.GITHUB_TOKEN && {
                Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
              }),
            },
          }
        );
        const decoded = Buffer.from(
          res.data.content.replace(/\n/g, ""),
          "base64"
        ).toString("utf-8");
        text += " " + decoded;
      } catch {
        // file doesn't exist in this repo — normal
      }
    })
  );

  const cleaned = cleanText(text);
  if (isBoilerplateDeps(cleaned)) return "";
  return cleaned;
}

// Returns the number of commits the given username has made to a repo.
// Uses /contributors (top-100, always immediately available) — avoids /stats/contributors
// which requires extra quota and returns 202 while GitHub computes it asynchronously.
async function getContributorCommits(owner, repo, username) {
  try {
    const res = await safeGet(
      `https://api.github.com/repos/${owner}/${repo}/contributors?anon=false&per_page=100`,
      githubHeaders()
    );
    if (!Array.isArray(res.data)) return 0;
    const entry = res.data.find(
      c => c.login?.toLowerCase() === username.toLowerCase()
    );
    return entry?.contributions || 0;
  } catch {
    return 0;
  }
}

module.exports = {
  MAX_PAGES,
  ENRICH_LIMIT,
  githubHeaders,
  safeGet,
  getAllRepos,
  getReadme,
  getProfileReadme,
  getDependencies,
  getContributorCommits,
  getRateLimit,
};
