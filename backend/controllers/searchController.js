const { searchUsers } = require("../services/searchService");
const { DOMAIN_SET }  = require("../constants/domains");

// ── Module-level constants ─────────────────────────────────────────────────────
const VALID_ROLES   = new Set(["student", "faculty", "recruiter"]);
const VALID_DEBUG   = new Set(["summary", "full", "true"]);
const DEFAULT_LIMIT = 20;
const MAX_LIMIT     = 50;

// ── GET /search/users ─────────────────────────────────────────────────────────
// Query params (all optional):
//   skills  — comma-separated required skill tokens, e.g. "React,MongoDB"
//   domains — comma-separated preferred domains,    e.g. "frontend,backend"
//   role    — "student" | "faculty" | "recruiter"
//   limit   — integer, default 20, capped at 50
//   debug   — "summary" | "full" | "true" — enables ranking observability fields
//
// Response: { total, results: [...], [searchDebug, mongoQuery, ...when debug] }
const VALID_ACTIVITY = new Set(["high", "medium", "low"]);

exports.searchUsersHandler = async (req, res) => {
  try {
    const {
      skills:   skillsParam,
      domains:  domainsParam,
      role,
      year:     yearParam,
      branch:   branchParam,
      activity: activityParam,
      limit,
      debug,
    } = req.query;

    // ── Parse skills — normalise to lowercase for consistent matching ──
    const skills = skillsParam
      ? skillsParam.split(",").map(s => s.trim().toLowerCase()).filter(Boolean)
      : [];

    // ── Parse and validate domains ──
    const rawDomains = domainsParam
      ? domainsParam.split(",").map(d => d.trim().toLowerCase()).filter(Boolean)
      : [];

    const unknownDomains = rawDomains.filter(d => !DOMAIN_SET.has(d));
    if (unknownDomains.length > 0) {
      return res.status(400).json({
        message: `Unknown domain(s): ${unknownDomains.join(", ")}`,
        valid:   [...DOMAIN_SET],
      });
    }

    // ── Validate role ──
    if (role && !VALID_ROLES.has(role)) {
      return res.status(400).json({ message: "role must be student, faculty, or recruiter" });
    }

    // ── Parse year ──
    const years = yearParam
      ? yearParam.split(",").map(y => parseInt(y.trim(), 10)).filter(y => !isNaN(y) && y >= 1 && y <= 4)
      : [];

    // ── Parse branch ──
    const branches = branchParam
      ? branchParam.split(",").map(b => b.trim().toUpperCase()).filter(Boolean)
      : [];

    // ── Validate activity ──
    const activity = activityParam ? activityParam.trim().toLowerCase() : null;
    if (activity && !VALID_ACTIVITY.has(activity)) {
      return res.status(400).json({ message: "activity must be high, medium, or low" });
    }

    // ── Parse limit — cap hard at MAX_LIMIT ──
    const parsedLimit = limit
      ? Math.min(parseInt(limit, 10), MAX_LIMIT)
      : DEFAULT_LIMIT;

    if (isNaN(parsedLimit) || parsedLimit < 1) {
      return res.status(400).json({ message: "limit must be a positive integer" });
    }

    // ── Validate debug param ──
    if (debug !== undefined && !VALID_DEBUG.has(debug)) {
      return res.status(400).json({ message: "debug must be summary, full, or true" });
    }

    const result = await searchUsers({
      skills,
      domains:  rawDomains,
      role,
      years,
      branches,
      activity,
      limit:    parsedLimit,
      debug:    debug || false,
    });

    return res.json(result);

  } catch (err) {
    console.error("Search error:", err.message);
    return res.status(500).json({ message: "Search failed" });
  }
};
