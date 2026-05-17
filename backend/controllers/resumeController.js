const axios     = require("axios");
const FormData  = require("form-data");
const User      = require("../models/User");
const { DOMAIN_LIST } = require("../constants/domains");
const { analyseResumeVsJD } = require("../services/resumeImprovementService");

const RESUME_PARSER_URL = process.env.RESUME_PARSER_URL || "http://localhost:8000";

// ── Helpers ───────────────────────────────────────────────────────────────────

// Flatten categorized github skills into a normalized set (github-only source of truth).
function buildGithubNormalizedSkills(skills) {
  const all = new Set();
  for (const arr of Object.values(skills || {})) {
    for (const s of arr) {
      if (s) all.add(s.toLowerCase());
    }
  }
  return [...all].sort();
}

// Merge resume skills (ontology-matched) + unknown raw skills into one flat list.
// Unknown skills are kept lowercase so they can match JD extraction output exactly.
function buildResumeNormalizedSkills(normalizedSkills, unknownSkills) {
  const all = new Set();
  for (const s of normalizedSkills || []) {
    if (s) all.add(s.toLowerCase());
  }
  for (const s of unknownSkills || []) {
    const clean = s.toLowerCase().trim();
    // Skip very short tokens or obvious noise
    if (clean.length >= 2 && clean.length <= 40) all.add(clean);
  }
  return [...all].sort();
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

// ── Upload controller ─────────────────────────────────────────────────────────

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
    return res.status(502).json({ detail: "Resume parsing service unavailable" });
  }

  // Persist into User document
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // ── Resume skills — stored separately from GitHub skills ──────────────────
    // parseResult.skills  → ontology-matched, categorized
    // parseResult.unknownSkills → raw tokens not in ontology (e.g. "dsa", "pen testing")
    user.resumeSkills = parseResult.skills;
    user.resumeNormalizedSkills = buildResumeNormalizedSkills(
      parseResult.normalizedSkills,
      parseResult.unknownSkills,
    );

    // ── GitHub skills stay untouched ──────────────────────────────────────────
    // normalizedSkills is the github-only flat list; rebuild it from user.skills
    // so a resume re-upload never compounds resume tokens into the github set.
    user.normalizedSkills = buildGithubNormalizedSkills(user.skills);

    // ── Domain scores: merge github (0.6) + resume (0.4) ─────────────────────
    // Always merge against pure github domain scores, not the accumulated vector,
    // so re-uploading a resume doesn't compound previous resume scores.
    const githubDomainScores = user.githubData?.domainScores ?? {};
    const mergedScores = mergeDomainScores(githubDomainScores, parseResult.domainScores);
    for (const [domain, score] of Object.entries(mergedScores)) {
      user.domainScores.set(domain, score);
    }

    const newTopDomains = computeTopDomains(mergedScores);
    user.topDomains = newTopDomains.map(({ domain, score }) => {
      const existing = user.topDomains.find(d => d.domain === domain);
      return { domain, score, metrics: existing?.metrics ?? {} };
    });

    // ── Store original file for download ──────────────────────────────────────
    user.resumeFile = {
      data:         req.file.buffer,
      contentType:  req.file.mimetype,
      originalName: req.file.originalname,
    };

    user.resumeData = parseResult;
    user.markModified("domainScores");
    user.markModified("resumeData");
    user.markModified("resumeFile");

    await user.save();

    return res.json({
      message: "Resume processed successfully",
      resumeData: parseResult,
      updatedProfile: {
        skills:                 user.skills,            // github (unchanged)
        resumeSkills:           user.resumeSkills,
        normalizedSkills:       user.normalizedSkills,
        resumeNormalizedSkills: user.resumeNormalizedSkills,
        domainScores:           Object.fromEntries(user.domainScores),
        topDomains:             user.topDomains,
      },
    });
  } catch (err) {
    console.error("Resume merge error:", err);
    return res.status(500).json({ detail: "Failed to save resume data" });
  }
}

// ── Download controller ───────────────────────────────────────────────────────

async function downloadResume(req, res) {
  try {
    const { githubUsername } = req.params;
    const user = await User.findOne(
      { githubUsername },
      { resumeFile: 1 },
    );

    if (!user || !user.resumeFile?.data) {
      return res.status(404).json({ message: "No resume file found for this user" });
    }

    const { data, contentType, originalName } = user.resumeFile;
    const safeName = (originalName || "resume").replace(/[^a-zA-Z0-9._-]/g, "_");

    res.set("Content-Type", contentType || "application/octet-stream");
    res.set("Content-Disposition", `attachment; filename="${safeName}"`);
    res.set("Content-Length", data.length);
    return res.send(data);
  } catch (err) {
    console.error("Resume download error:", err);
    return res.status(500).json({ detail: "Failed to retrieve resume file" });
  }
}

// ── Improve controller ────────────────────────────────────────────────────────
// POST /resume/improve
// Body: { jobDescription } — analyses logged-in user's profile vs the JD

async function improveResume(req, res) {
  try {
    const { jobDescription } = req.body;
    if (!jobDescription || jobDescription.trim().length < 30) {
      return res.status(400).json({ message: "jobDescription must be at least 30 characters" });
    }
    if (jobDescription.length > 4000) {
      return res.status(400).json({ message: "jobDescription must not exceed 4000 characters" });
    }

    const user = await User.findById(req.user.id)
      .select("name normalizedSkills resumeNormalizedSkills topDomains githubData resumeData")
      .lean();

    if (!user) return res.status(404).json({ message: "User not found" });

    const analysis = await analyseResumeVsJD(user, jobDescription.trim());
    return res.json({ analysis });
  } catch (err) {
    console.error("Resume improve error:", err.message);
    const isGroq = err.message.includes("Groq") || err.message.includes("parse");
    return res.status(isGroq ? 502 : 500).json({ message: err.message || "Analysis failed" });
  }
}

module.exports = { uploadResume, downloadResume, improveResume };
