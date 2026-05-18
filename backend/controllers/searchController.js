const { searchUsers }   = require("../services/searchService");
const { DOMAIN_SET }    = require("../constants/domains");
const { parseJDQuery }  = require("../services/jdQueryParser");

// ── Module-level constants ─────────────────────────────────────────────────────
const VALID_ROLES   = new Set(["student", "faculty", "recruiter"]);
const VALID_DEBUG   = new Set(["summary", "full", "true"]);
const DEFAULT_LIMIT = 20;
const MAX_LIMIT     = 500;

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

// ── POST /search ──────────────────────────────────────────────────────────────
// Unified endpoint — combines filter-based and semantic search in one call.
//
// Body:
//   query?    — free-text JD / description (optional)
//   domains?  — string[] selected domain filters, applied as hard gate first
//   skills?   — string[] explicit skill chips from UI, merged with LLM-extracted skills
//   year?     — number[]
//   branch?   — string[]
//   activity? — "high" | "medium" | "low"
//   limit?    — integer, default 20
//   debug?    — "summary" | "full"
//
// Behaviour:
//   no query, domains selected → structured search within selected domains
//   query provided, no domains → pure semantic (Voyage domain relevance, all users)
//   query + domains selected  → domain gate applied first, then semantic ranking within that pool
exports.unifiedSearchHandler = async (req, res) => {
  try {
    const {
      query,
      domains:  domainsParam  = [],
      skills:   skillsParam   = [],
      year:     yearParam      = [],
      branch:   branchParam    = [],
      activity: activityParam,
      limit,
      debug,
    } = req.body;

    // ── Validate domains ──
    const filterDomains = domainsParam.map(d => d.toString().trim().toLowerCase()).filter(Boolean);
    const unknownDomains = filterDomains.filter(d => !DOMAIN_SET.has(d));
    if (unknownDomains.length) {
      return res.status(400).json({ message: `Unknown domain(s): ${unknownDomains.join(", ")}`, valid: [...DOMAIN_SET] });
    }

    // ── Validate activity ──
    const activity = activityParam ? activityParam.trim().toLowerCase() : null;
    if (activity && !VALID_ACTIVITY.has(activity)) {
      return res.status(400).json({ message: "activity must be high, medium, or low" });
    }

    // ── Validate limit ──
    let parsedLimit = DEFAULT_LIMIT;
    if (limit !== undefined) {
      parsedLimit = parseInt(limit, 10);
      if (isNaN(parsedLimit) || parsedLimit < 1) {
        return res.status(400).json({ message: "limit must be a positive integer" });
      }
      parsedLimit = Math.min(parsedLimit, MAX_LIMIT);
    }

    // ── Validate debug ──
    if (debug !== undefined && !VALID_DEBUG.has(debug)) {
      return res.status(400).json({ message: "debug must be summary, full, or true" });
    }

    // ── Explicit skills from UI chips ──
    const explicitSkills = skillsParam.map(s => s.toString().trim().toLowerCase()).filter(Boolean);

    // ── Years and branches ──
    const years    = yearParam.map   ? yearParam.map(y => parseInt(y, 10)).filter(y => !isNaN(y) && y >= 1 && y <= 4) : [];
    const branches = branchParam.map ? branchParam.map(b => b.toString().trim().toUpperCase()).filter(Boolean) : [];

    // ── Query parsing (only if query provided) ──
    let skills         = explicitSkills;
    let domainRelevance;
    let topDomains     = filterDomains;
    let domainConfidences;
    let extractionMethod = "none";

    const hasQuery = query && typeof query === "string" && query.trim().length > 0;
    if (hasQuery) {
      if (query.length > 2000) {
        return res.status(400).json({ message: "query must not exceed 2000 characters" });
      }
      const parsed = await parseJDQuery(query.trim());
      skills           = [...new Set([...parsed.skills, ...explicitSkills])];
      domainRelevance  = parsed.domainRelevance;
      topDomains       = parsed.topDomains;
      domainConfidences= parsed.domainConfidences;
      extractionMethod = parsed.extractionMethod;
    }

    const result = await searchUsers({
      skills,
      domains:        filterDomains,
      domainRelevance,
      years,
      branches,
      activity,
      limit:   parsedLimit,
      debug:   debug || false,
    });

    return res.json({
      queryInterpretation: {
        hasQuery,
        extractedSkills:    skills,
        filterDomains,
        topDomains,
        domainRelevance,
        domainConfidences,
        extractionMethod,
      },
      ...result,
    });

  } catch (err) {
    console.error("Unified search error:", err.message);
    return res.status(500).json({ message: "Search failed" });
  }
};

// ── POST /search/semantic ─────────────────────────────────────────────────────
// Body: { query, limit?, debug? }
// Parses a free-text recruiter JD into skills + domains, then delegates to searchUsers.
exports.semanticSearchHandler = async (req, res) => {
  try {
    const { query, limit, debug } = req.body;

    // Validate query
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return res.status(400).json({ message: "query is required and must be a non-empty string" });
    }
    if (query.length > 2000) {
      return res.status(400).json({ message: "query must not exceed 2000 characters" });
    }

    // Validate limit
    let parsedLimit = DEFAULT_LIMIT;
    if (limit !== undefined) {
      parsedLimit = parseInt(limit, 10);
      if (isNaN(parsedLimit) || parsedLimit < 1) {
        return res.status(400).json({ message: "limit must be a positive integer" });
      }
      parsedLimit = Math.min(parsedLimit, MAX_LIMIT);
    }

    // Parse JD into skills + domain relevance vector
    const { skills, domainRelevance, topDomains, domainConfidences, extractionMethod } =
      await parseJDQuery(query.trim());

    // Delegate to ranking engine — passes domainRelevance vector for dot-product scoring
    const result = await searchUsers({
      skills,
      domainRelevance,
      limit:   parsedLimit,
      debug:   debug || false,
    });

    return res.json({
      queryInterpretation: {
        extractedSkills:    skills,
        topDomains,
        domainRelevance,
        domainConfidences,
        extractionMethod,
      },
      ...result,
    });

  } catch (err) {
    console.error("Semantic search error:", err.message);
    return res.status(500).json({ message: "Semantic search failed" });
  }
};
