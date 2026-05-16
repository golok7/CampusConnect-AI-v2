const axios     = require("axios");
const FormData  = require("form-data");
const User      = require("../models/User");
const { DOMAIN_LIST } = require("../constants/domains");

const RESUME_PARSER_URL = process.env.RESUME_PARSER_URL || "http://localhost:8000";

// ── Merge helpers ─────────────────────────────────────────────────────────────

function mergeSkills(existing, resume) {
  const cats = ["languages", "frameworks", "libraries", "databases", "tools"];
  const result = {};
  for (const cat of cats) {
    result[cat] = [...new Set([...(existing[cat] || []), ...(resume[cat] || [])])];
  }
  return result;
}

function mergeNormalizedSkills(existing, resume) {
  return [...new Set([...existing, ...resume])];
}

function mergeDomainScores(githubMap, resumeScores) {
  const merged = {};
  for (const domain of DOMAIN_LIST) {
    const githubScore = githubMap instanceof Map
      ? (githubMap.get(domain) ?? 0)
      : (githubMap?.[domain] ?? 0);
    const resumeScore = resumeScores?.[domain] ?? 0;
    merged[domain] = (githubScore > 0 && resumeScore > 0)
      ? Math.round(0.6 * githubScore + 0.4 * resumeScore)
      : Math.max(githubScore, resumeScore);
  }
  return merged;
}

function computeTopDomains(mergedScores) {
  return Object.entries(mergedScores)
    .filter(([, score]) => score > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([domain, score]) => ({ domain, score }));
}

// ── Controller ────────────────────────────────────────────────────────────────

async function uploadResume(req, res) {
  if (!req.file) {
    return res.status(400).json({ detail: "No resume file provided" });
  }

  // Forward file to Python microservice
  let parseResult;
  try {
    const form = new FormData();
    form.append("file", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const response = await axios.post(`${RESUME_PARSER_URL}/resume/parse`, form, {
      headers: form.getHeaders(),
      timeout: 30_000,
    });
    parseResult = response.data;
  } catch (err) {
    if (err.response) {
      const status = err.response.status >= 500 ? 502 : 422;
      return res.status(status).json({
        detail: `Resume parsing service error: ${err.response.data?.detail || "unknown"}`,
      });
    }
    // Network error / timeout
    return res.status(502).json({ detail: "Resume parsing service unavailable" });
  }

  // Merge into User document
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.skills         = mergeSkills(user.skills, parseResult.skills);
    user.normalizedSkills = mergeNormalizedSkills(user.normalizedSkills, parseResult.normalizedSkills);

    // Merge against pure GitHub domain scores, not the accumulated profile vector.
    // This ensures re-uploading a resume doesn't compound previous resume scores.
    const githubDomainScores = user.githubData?.domainScores ?? {};
    const mergedScores  = mergeDomainScores(githubDomainScores, parseResult.domainScores);
    // Persist merged scores back into the Map
    for (const [domain, score] of Object.entries(mergedScores)) {
      user.domainScores.set(domain, score);
    }

    const newTopDomains = computeTopDomains(mergedScores);
    // Preserve metrics from existing topDomains where available
    user.topDomains = newTopDomains.map(({ domain, score }) => {
      const existing = user.topDomains.find(d => d.domain === domain);
      return { domain, score, metrics: existing?.metrics ?? {} };
    });

    user.resumeData = parseResult;
    user.markModified("domainScores");
    user.markModified("resumeData");

    await user.save();

    return res.json({
      message: "Resume processed successfully",
      resumeData: parseResult,
      updatedProfile: {
        skills:           user.skills,
        normalizedSkills: user.normalizedSkills,
        domainScores:     Object.fromEntries(user.domainScores),
        topDomains:       user.topDomains,
      },
    });
  } catch (err) {
    console.error("Resume merge error:", err);
    return res.status(500).json({ detail: "Failed to save resume data" });
  }
}

module.exports = { uploadResume };
