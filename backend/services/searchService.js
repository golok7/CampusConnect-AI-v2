const User = require("../models/User");
const { buildSkillWeightMap, SKILL_WEIGHTS } = require("../constants/skillWeights");
const { DOMAIN_INTEREST_MAP } = require("../constants/domains");

// ── Architecture ───────────────────────────────────────────────────────────────
// Structured path  (GET /search/users):
//   Stage 1 — Domain threshold pre-filter  (MongoDB, hard gate, $gte DOMAIN_THRESHOLD)
//   Stage 2 — Broad skill candidate retrieval (MongoDB, $in on normalizedSkills)
//   Stage 3 — Skill coverage score
//   Stage 4 — Final ranking  (0.30 skill + 0.55 domain + 0.15 activity)
//
// Semantic path  (POST /search/semantic):
//   Stage 1 — No domain gate — scan all github/resume users; skill $in if any
//   Stage 2 — Dot-product domain ranking: Σ(user.domainScore[d] × queryRelevance[d])
//   Stage 3 — Final ranking  (0.30 skill + 0.55 dot-product + 0.15 activity)
//             Multi-domain co-activation — hybrid candidates naturally outscore pure specialists
// ─────────────────────────────────────────────────────────────────────────────

const SEARCH_DEFAULTS      = { limit: 20, MAX_LIMIT: 50 };
const DOMAIN_THRESHOLD     = 5;
const TOP_DOMAIN_MIN_RATIO = 0.05;

// tanh compression maps raw domain scores smoothly into 0–1, no hard ceiling.
// tanh(x / 40):  15→0.36  30→0.64  50→0.85  80→0.96
const DOMAIN_TANH_SCALE = 40;

// ── Domain scoring ─────────────────────────────────────────────────────────────

function getDomainScore(user, domain) {
  if (user.domainScores) {
    const score = user.domainScores instanceof Map
      ? user.domainScores.get(domain)
      : user.domainScores[domain];
    if (score !== undefined && score !== null) return score;
  }
  const entry = (user.topDomains || []).find(d => d.domain === domain);
  return entry ? (entry.score || 0) : 0;
}

// Returns { rawScore, normalizedScore, perDomain, perDomainScaled, matchedRequestedDomains }
// normalizedScore = average of tanh(perDomainRaw / DOMAIN_TANH_SCALE) across requested domains
function computeDomainInfo(user, requestedDomains) {
  if (!requestedDomains.length) {
    return { rawScore: 0, normalizedScore: 0, perDomain: {}, perDomainScaled: {}, matchedRequestedDomains: [] };
  }

  const perDomain       = {};
  const perDomainScaled = {};
  let rawScore  = 0;
  let scaledSum = 0;
  const matchedRequestedDomains = [];

  for (const domain of requestedDomains) {
    const raw    = getDomainScore(user, domain);
    const scaled = Math.tanh(raw / DOMAIN_TANH_SCALE);
    perDomain[domain]       = raw;
    perDomainScaled[domain] = +scaled.toFixed(4);
    rawScore  += raw;
    scaledSum += scaled;
    if (raw >= DOMAIN_THRESHOLD) matchedRequestedDomains.push(domain);
  }

  // 0.7 × max + 0.3 × avg of tanh-scaled domain scores.
  // Preserves specialist strength while still rewarding balanced engineers.
  // Avoids harmonic mean's over-punishment of weak secondary domains.
  // frontend=0.944, backend=0.206 → 0.7×0.944 + 0.3×0.575 = 0.833 (not 0.338)
  const scaledValues    = Object.values(perDomainScaled);
  const maxScaled       = Math.max(...scaledValues);
  const avgScaled       = scaledValues.reduce((s, v) => s + v, 0) / scaledValues.length;
  const normalizedScore = 0.7 * maxScaled + 0.3 * avgScaled;

  return { rawScore, normalizedScore, perDomain, perDomainScaled, matchedRequestedDomains };
}

// ── Skill scoring ──────────────────────────────────────────────────────────────

// Weighted coverage: sqrt(Σweight(matched) / Σweight(requested))  →  0–1
// Specialised skills (Kafka=4, LoRA=5) contribute more than generic ones (Docker=1, Python=1).
// sqrt compression still softens harsh punishment for partial matches.
// Returns { score, matched, missing, matchedCount, requestedCount, matchedWeight, totalWeight, weights }
function computeSkillInfo(user, requestedSkills) {
  if (!requestedSkills.length) {
    return { score: 1, matched: [], missing: [], matchedCount: 0, requestedCount: 0, matchedWeight: 0, totalWeight: 0, weights: {} };
  }

  const candidateSkills = new Set(user.normalizedSkills || []);
  const weights         = buildSkillWeightMap(requestedSkills);
  const matched = [];
  const missing = [];
  let matchedWeight = 0;
  let totalWeight   = 0;

  for (const skill of requestedSkills) {
    const w = weights[skill];
    totalWeight += w;
    if (candidateSkills.has(skill)) {
      matched.push(skill);
      matchedWeight += w;
    } else {
      missing.push(skill);
    }
  }

  return {
    score:          totalWeight === 0 ? 0 : Math.sqrt(matchedWeight / totalWeight),
    matched,
    missing,
    matchedCount:   matched.length,
    requestedCount: requestedSkills.length,
    matchedWeight,
    totalWeight,
    weights,
  };
}

// ── Semantic dot-product domain scoring ───────────────────────────────────────
//
// Computes Σ(tanh(user.domainScore[d] / scale) × queryRelevance[d]) / Σ(queryRelevance[d])
// Both factors are in [0,1], result is in [0,1].
// A balanced candidate (backend:80 + devops:70 + systems:40) outscores a pure specialist
// (systems:100) when the query has mixed infra relevance — correct for hybrid role JDs.
function computeSemanticDomainScore(user, domainRelevance) {
  let dotProduct     = 0;
  let relevanceTotal = 0;
  for (const [domain, relevance] of Object.entries(domainRelevance)) {
    const raw    = getDomainScore(user, domain);
    const scaled = Math.tanh(raw / DOMAIN_TANH_SCALE);
    dotProduct     += scaled * relevance;
    relevanceTotal += relevance;
  }
  return relevanceTotal > 0 ? dotProduct / relevanceTotal : 0;
}

// ── Activity normalization ─────────────────────────────────────────────────────

// Returns { activityScore, normalizedActivity }
// Formula: Math.min(Math.log(activityScore + 1) / 6, 1)
function computeActivityInfo(user) {
  const raw        = user.activityScore || 0;
  const normalized = Math.min(Math.log(raw + 1) / 6, 1);
  return { activityScore: raw, normalizedActivity: normalized };
}

// ── Ranking weights by query scenario ─────────────────────────────────────────

const SCENARIO_WEIGHTS = {
  both:        { skill: 0.30, domain: 0.55, activity: 0.15 },
  skillOnly:   { skill: 0.85, domain: 0.00, activity: 0.15 },
  domainOnly:  { skill: 0.00, domain: 0.85, activity: 0.15 },
  activityOnly:{ skill: 0.00, domain: 0.00, activity: 1.00 },
};

function pickWeights(hasSkills, hasDomains) {
  if (hasSkills && hasDomains) return SCENARIO_WEIGHTS.both;
  if (hasSkills)               return SCENARIO_WEIGHTS.skillOnly;
  if (hasDomains)              return SCENARIO_WEIGHTS.domainOnly;
  return SCENARIO_WEIGHTS.activityOnly;
}

// Returns { finalScore, skillInfo, domainInfo, activityInfo, weights }
function computeFullRanking(user, requestedDomains, requestedSkills) {
  const skillInfo    = computeSkillInfo(user, requestedSkills);
  const domainInfo   = computeDomainInfo(user, requestedDomains);
  const activityInfo = computeActivityInfo(user);
  const weights      = pickWeights(requestedSkills.length > 0, requestedDomains.length > 0);

  const finalScore =
    weights.skill    * skillInfo.score +
    weights.domain   * domainInfo.normalizedScore +
    weights.activity * activityInfo.normalizedActivity;

  return { finalScore, skillInfo, domainInfo, activityInfo, weights };
}

// ── Console per-user breakdown (debug mode only) ───────────────────────────────

function logUserBreakdown(ranked, requestedDomains) {
  console.log("\n── Per-user ranking breakdown ──────────────────────");
  ranked.forEach(({ user: u, score, ranking }, idx) => {
    const { skillInfo: sk, domainInfo: dom, activityInfo: act, weights: w } = ranking;

    console.log(`\n  #${idx + 1}  ${u.name}  (@${u.githubUsername})`);
    console.log(`    Skills    : matched=[${sk.matched.join(", ")}]  missing=[${sk.missing.join(", ")}]  ${sk.matchedCount}/${sk.requestedCount} = ${sk.score.toFixed(3)}`);

    if (requestedDomains.length) {
      const domParts = Object.entries(dom.perDomain)
        .map(([d, v]) => `${d}=${v}(→${dom.perDomainScaled[d]})`)
        .join("  ");
      console.log(`    Domain    : ${domParts}  normalized=${dom.normalizedScore.toFixed(3)}`);
    }

    const topDomStr = (u.topDomains || [])
      .slice(0, 4)
      .map(d => `${d.domain}:${d.score?.toFixed(0)}`)
      .join("  ");
    console.log(`    TopDomains: ${topDomStr}`);
    console.log(`    Activity  : raw=${act.activityScore}  normalized=${act.normalizedActivity.toFixed(3)}`);
    console.log(`    FINAL     : ${w.skill}×${sk.score.toFixed(3)} + ${w.domain}×${dom.normalizedScore.toFixed(3)} + ${w.activity}×${act.normalizedActivity.toFixed(3)} = ${score.toFixed(4)}`);
  });
  console.log("\n────────────────────────────────────────────────────");
}

// ── whyMatched builder ────────────────────────────────────────────────────────
// Query-scoped explainability: answers "why did this person rank for THIS query?"
// Intentionally lightweight — repo-level evidence belongs in profileService.js.
//
// matchedDomains  : query domains the user actually cleared DOMAIN_THRESHOLD on.
// matchedSkills   : query skills confirmed present in normalizedSkills.
// semanticSummary : one-line string built from the user's top 2 domains + top skills.

function buildWhyMatched(user, requestedDomains, requestedSkills, skillInfo) {
  // ── 1. Matched domains (query-scoped) ──
  const queryDomains  = new Set(requestedDomains);
  const matchedDomains = (user.topDomains || [])
    .filter(d => queryDomains.has(d.domain) && (d.score || 0) >= DOMAIN_THRESHOLD)
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .map(d => d.domain);

  // ── 2. Matched skills (query-scoped only — no domain-unconstrained filler) ──
  //
  // DESIGN DECISION: We only show skills that were explicitly in the query AND
  // confirmed present on the candidate. We do NOT fill with the candidate's
  // globally highest-weight skills — that caused semantic leakage where
  // three.js / langchain appeared in cybersecurity search results.
  //
  // An honest short list is better than a misleading padded list.
  const matchedSkills = [...skillInfo.matched];

  // ── 3. Semantic summary (template — no LLM, no repo lookup) ──
  const topTwo = (user.topDomains || [])
    .filter(d => (d.score || 0) >= DOMAIN_THRESHOLD)
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 2);

  const label = d => DOMAIN_INTEREST_MAP[d] || d;
  let semanticSummary =
    topTwo.length >= 2 ? `${label(topTwo[0].domain)} and ${label(topTwo[1].domain)} engineer`
    : topTwo.length === 1 ? `${label(topTwo[0].domain)} engineer`
    : "Software engineer";

  const topSkillNames = matchedSkills.slice(0, 3)
    .map(s => s.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "));

  if (topSkillNames.length) {
    semanticSummary += ` with hands-on experience in ${topSkillNames.join(", ")}.`;
  } else {
    semanticSummary += ".";
  }

  return { matchedDomains, matchedSkills, missingSkills: skillInfo.missing, semanticSummary };
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Search and rank users.
 *
 * @param {Object}                  opts
 * @param {string[]}                opts.skills         - Skill tokens for coverage matching
 * @param {string[]}               [opts.domains]       - Structured path: domain names for pre-filter
 * @param {Record<string,number>}  [opts.domainRelevance] - Semantic path: continuous relevance vector
 * @param {string}                 [opts.role]          - Optional role filter
 * @param {number}                  opts.limit          - Max results
 * @param {string|false}            opts.debug          - "summary" | "full" | false
 */
const ACTIVITY_RANGES = {
  high:   { $gte: 200 },
  medium: { $gte: 80, $lt: 200 },
  low:    { $lt: 80 },
};

exports.searchUsers = async ({
  skills         = [],
  domains        = [],
  domainRelevance,           // semantic path — Record<domain, relevance>
  role,
  years          = [],
  branches       = [],
  activity       = null,
  limit          = SEARCH_DEFAULTS.limit,
  debug          = false,
}) => {
  const isSemanticPath = domainRelevance !== undefined && Object.keys(domainRelevance).length > 0;
  const safeLimit      = Math.min(limit, SEARCH_DEFAULTS.MAX_LIMIT);
  const normalizedReqs = skills.map(s => s.toLowerCase().trim()).filter(Boolean);

  const debugMode =
    debug === "full" || debug === true || debug === "true" ? "full" :
    debug === "summary"                                    ? "summary" :
    false;

  // Base filter: GitHub profile OR resume uploaded (both are valid talent signals).
  const dbQuery = {
    $or: [
      { githubUsername: { $exists: true, $ne: null } },
      { resumeData:     { $ne: null } },
    ],
  };
  if (role)             dbQuery.role = role;
  if (years.length)     dbQuery.year = { $in: years };
  if (branches.length)  dbQuery.branch = { $in: branches };
  if (activity && ACTIVITY_RANGES[activity]) {
    dbQuery.activityScore = ACTIVITY_RANGES[activity];
  }

  if (isSemanticPath) {
    // Semantic path: NO domain threshold gate.
    // Dot-product ranking surfaces relevant candidates regardless of domain membership.
    // Skill $in filter still narrows the pool when skills are specified.
    if (normalizedReqs.length) {
      dbQuery.normalizedSkills = { $in: normalizedReqs };
    }
  } else {
    // Structured path: hard domain threshold gate (preserves existing behaviour).
    if (domains.length) {
      dbQuery.$or = domains.map(domain => ({
        [`domainScores.${domain}`]: { $gte: DOMAIN_THRESHOLD },
      }));
    }
    if (normalizedReqs.length) {
      dbQuery.normalizedSkills = { $in: normalizedReqs };
    }
  }

  // In debug mode run extra counts for pipeline stats
  let countAllGithub   = null;
  let countAfterRole   = null;
  let countAfterDomain = null;

  if (debugMode) {
    const baseQuery = { $or: [{ githubUsername: { $exists: true, $ne: null } }, { resumeData: { $ne: null } }] };
    countAllGithub = await User.countDocuments(baseQuery);

    const afterRoleQuery = { ...baseQuery };
    if (role) afterRoleQuery.role = role;
    countAfterRole = await User.countDocuments(afterRoleQuery);

    if (!isSemanticPath && domains.length) {
      countAfterDomain = await User.countDocuments({
        ...afterRoleQuery,
        $or: domains.map(d => ({ [`domainScores.${d}`]: { $gte: DOMAIN_THRESHOLD } })),
      });
    } else {
      countAfterDomain = countAfterRole; // semantic path has no domain gate
    }
  }

  const users = await User.find(dbQuery, {
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
    // raw activity components (present when GitHub sync has run)
    repoCount:        1,
    commitCount:      1,
    starCount:        1,
    activeDays:       1,
    totalCommits:     1,
    totalStars:       1,
  }).lean();

  const countAfterSkill = users.length;

  // ── Stage 3 + 4: Score and rank ──
  // Derive topDomains list for whyMatched on the semantic path
  const queryTopDomains = isSemanticPath
    ? Object.entries(domainRelevance)
        .filter(([, r]) => r >= 0.45)
        .sort(([, a], [, b]) => b - a)
        .map(([d]) => d)
        .slice(0, 6)
    : domains;

  const scoredUsers = users.map(u => {
    if (isSemanticPath) {
      const skillInfo    = computeSkillInfo(u, normalizedReqs);
      const domainScore  = computeSemanticDomainScore(u, domainRelevance);
      const activityInfo = computeActivityInfo(u);
      const weights      = pickWeights(normalizedReqs.length > 0, true);
      const finalScore   =
        weights.skill    * skillInfo.score +
        weights.domain   * domainScore +
        weights.activity * activityInfo.normalizedActivity;
      // Wrap in the same shape as computeFullRanking for downstream code reuse
      const ranking = {
        finalScore,
        skillInfo,
        domainInfo:   { normalizedScore: domainScore, perDomain: {}, perDomainScaled: {}, matchedRequestedDomains: [] },
        activityInfo,
        weights,
      };
      return { user: u, score: finalScore, ranking };
    }
    const ranking = computeFullRanking(u, domains, normalizedReqs);
    return { user: u, score: ranking.finalScore, ranking };
  });

  const preSortSnapshot = scoredUsers.slice(0, 5).map(({ user: u }) => ({
    name: u.name, githubUsername: u.githubUsername,
  }));

  const ranked = scoredUsers
    .sort((a, b) => b.score - a.score)
    .slice(0, safeLimit);

  // ── Console summary ──
  console.log("\n========== SEARCH DEBUG ==========");
  console.log("Debug mode       :", debugMode || "off");
  console.log("Search path      :", isSemanticPath ? "semantic (dot-product)" : "structured (domain filter)");
  console.log("Requested Domains:", isSemanticPath ? queryTopDomains : domains);
  console.log("Requested Skills :", normalizedReqs);
  console.log("FINAL QUERY      :", JSON.stringify(dbQuery, null, 2));
  if (debugMode) {
    console.log("Candidate stages :");
    console.log(`  all github    : ${countAllGithub}`);
    console.log(`  after role    : ${countAfterRole}`);
    console.log(`  after domain  : ${countAfterDomain}`);
    console.log(`  after skill   : ${countAfterSkill}`);
    console.log(`  final ranked  : ${ranked.length}`);
    logUserBreakdown(ranked, queryTopDomains);
  } else {
    console.log("Users fetched    :", countAfterSkill, "→ ranked:", ranked.length);
  }
  console.log("===================================\n");

  // ── Build results ──
  const results = ranked.map(({ user: u, score, ranking }) => {
    const result = {
      _id:            u._id,
      name:           u.name,
      githubUsername: u.githubUsername,
      branch:         u.branch,
      year:           u.year,
      role:           u.role,
      interests:      u.interests,
      skills:         u.skills,
      topDomains:     u.topDomains,
      activityScore:  u.activityScore,
      rankScore:      Math.round(score * 1000) / 1000,
      whyMatched:     buildWhyMatched(u, queryTopDomains, normalizedReqs, ranking.skillInfo),
    };

    if (debugMode) {
      // Skill normalization snapshot: show only skills relevant to the query
      // so recruiters can audit exact token matching without wading through 200 skills
      const userSkillsSnapshot = (u.normalizedSkills || [])
        .filter(s => normalizedReqs.includes(s) || ranking.skillInfo.matched.includes(s))
        .slice(0, 30);

      result.skillDebug = {
        requestedSkills:      normalizedReqs,
        matchedSkills:        ranking.skillInfo.matched,
        missingSkills:        ranking.skillInfo.missing,
        matchedCount:         ranking.skillInfo.matchedCount,
        requestedCount:       ranking.skillInfo.requestedCount,
        matchedWeight:        +ranking.skillInfo.matchedWeight.toFixed(3),
        totalWeight:          +ranking.skillInfo.totalWeight.toFixed(3),
        skillScore:           +ranking.skillInfo.score.toFixed(4),
        formula:              "Math.sqrt(Σweight(matched) / Σweight(requested))",
        skillWeights:         ranking.skillInfo.weights,
        userSkillsSnapshot,
      };

      result.rankingDebug = {
        finalScore: +score.toFixed(4),
        components: {
          skill:    +ranking.skillInfo.score.toFixed(4),
          domain:   +ranking.domainInfo.normalizedScore.toFixed(4),
          activity: +ranking.activityInfo.normalizedActivity.toFixed(4),
        },
        weights: ranking.weights,
      };
    }

    if (debugMode === "full") {
      // All top domains for entropy/contamination audit, not just requested ones
      const allTopDomains = {};
      (u.topDomains || []).forEach(d => { allTopDomains[d.domain] = d.score; });

      result.domainDebug = {
        matchedDomains:          ranking.domainInfo.perDomain,
        scaledDomains:           ranking.domainInfo.perDomainScaled,
        rawDomainScore:          +ranking.domainInfo.rawScore.toFixed(4),
        normalizedDomainScore:   +ranking.domainInfo.normalizedScore.toFixed(4),
        scalingFormula:          `Math.tanh(raw / ${DOMAIN_TANH_SCALE})  →  0.7 × max + 0.3 × avg across domains`,
        domainMatchType:         "OR",
        matchedRequestedDomains: ranking.domainInfo.matchedRequestedDomains,
        topDomainEntropy:        allTopDomains,
      };

      // Raw activity components for GitHub grinder detection
      const rawActivity = {};
      for (const field of ["repoCount", "commitCount", "totalCommits", "starCount", "totalStars", "activeDays"]) {
        if (u[field] !== undefined && u[field] !== null) rawActivity[field] = u[field];
      }

      result.activityDebug = {
        ...(Object.keys(rawActivity).length ? { rawComponents: rawActivity } : {}),
        activityScore:      ranking.activityInfo.activityScore,
        normalizedActivity: +ranking.activityInfo.normalizedActivity.toFixed(4),
        formula:            "Math.min(Math.log(activityScore + 1) / 6, 1)",
      };
    }

    return result;
  });

  // ── Top-level response ──
  const response = { total: users.length, results };

  if (debugMode) {
    response.searchDebug = {
      searchPath:       isSemanticPath ? "semantic" : "structured",
      requestedDomains: isSemanticPath ? queryTopDomains : domains,
      requestedSkills:  normalizedReqs,
      role:             role || null,
      domainThreshold:  isSemanticPath ? "none (dot-product)" : DOMAIN_THRESHOLD,
      candidateReduction: {
        allGithubUsers:   countAllGithub   ?? countAfterSkill,
        afterRoleFilter:  countAfterRole   ?? countAfterSkill,
        afterDomainFilter:countAfterDomain ?? countAfterSkill,
        afterSkillFilter: countAfterSkill,
        finalRanked:      ranked.length,
      },
    };

    response.mongoQuery = dbQuery;

    response.thresholdDebug = {
      domainThreshold:      DOMAIN_THRESHOLD,
      topDomainMinRatio:    TOP_DOMAIN_MIN_RATIO,
      skillMatchThreshold:  "any (OR logic via $in)",
      domainScalingFormula: `Math.tanh(raw / ${DOMAIN_TANH_SCALE})`,
      domainTanhScale:      DOMAIN_TANH_SCALE,
    };

    response.sortDebug = {
      preSortTopCandidates: preSortSnapshot,
      postSortTopCandidates: ranked.slice(0, 5).map(({ user: u, score: s }) => ({
        name: u.name, githubUsername: u.githubUsername, rankScore: +s.toFixed(4),
      })),
    };
  }

  if (debugMode === "full") {
    response.repoContributionDebug = ranked.slice(0, 5).map(({ user: u }) => ({
      name:           u.name,
      githubUsername: u.githubUsername,
      topDomains:     (u.topDomains || []).slice(0, 3).map(d => ({
        domain:  d.domain,
        score:   d.score,
        metrics: d.metrics || null,
      })),
    }));
  }

  return response;
};
