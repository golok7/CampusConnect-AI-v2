const User  = require("../models/User");
const Drive = require("../models/Drive");
const { getSimilarUsers, getComplementaryUsers, getJobRecommendations, getRoleMatching } = require("../services/recommendationService");
const { parseJDQuery }            = require("../services/jdQueryParser");
const { scoreUserAgainstParsedJD } = require("../services/searchService");

// In-process JD parse cache: key = driveId, value = { parsedJD, cachedAt }
// Invalidated after 30 min so stale descriptions don't linger.
const JD_CACHE = new Map();
const JD_CACHE_TTL = 30 * 60 * 1000;

async function getParsedJD(drive) {
  const key = drive._id.toString();
  const cached = JD_CACHE.get(key);
  if (cached && (Date.now() - cached.cachedAt) < JD_CACHE_TTL) return cached.parsedJD;

  const jdText = [
    drive.title,
    drive.description || "",
    drive.requiredSkills?.length ? `Required skills: ${drive.requiredSkills.join(", ")}` : "",
  ].filter(Boolean).join("\n");

  const parsedJD = await parseJDQuery(jdText);
  JD_CACHE.set(key, { parsedJD, cachedAt: Date.now() });
  return parsedJD;
}

exports.recommendUsers = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const allUsers = await User.find(
      { _id: { $ne: req.user.id } },
      { name: 1, topDomains: 1, branch: 1, year: 1, activityScore: 1, role: 1, githubUsername: 1 }
    );

    const similar       = getSimilarUsers(currentUser, allUsers);
    const complementary = getComplementaryUsers(currentUser, allUsers);

    res.json({ similar, complementary });

  } catch (err) {
    console.error("Recommendation error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

exports.recommendJobs = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id)
      .select("name normalizedSkills resumeNormalizedSkills topDomains domainScores activityScore")
      .lean();
    if (!currentUser) return res.status(404).json({ message: "User not found" });

    const activeDrives = await Drive.find({ status: "active" }).lean();
    if (!activeDrives.length) return res.json([]);

    // Parse all drive JDs in parallel (cached after first call)
    const parseResults = await Promise.allSettled(activeDrives.map(d => getParsedJD(d)));

    const recommendations = activeDrives
      .map((drive, i) => {
        try {
          const parsedJD = parseResults[i].status === "fulfilled"
            ? parseResults[i].value
            : { skills: drive.requiredSkills || [], domainRelevance: {} };
          const score = scoreUserAgainstParsedJD(currentUser, parsedJD);
          return { drive, score };
        } catch {
          return { drive, score: 0.01 };
        }
      })
      .sort((a, b) => b.score - a.score);

    res.json(recommendations);
  } catch (err) {
    console.error("Job reco error:", err.message, err.stack);
    res.status(500).json({ message: "Server error" });
  }
};

exports.recommendInternships = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) return res.status(404).json({ message: "User not found" });

    const activeDrives = await Drive.find({ status: "active", type: "internship" }).lean();
    const recommendations = getJobRecommendations(currentUser, activeDrives);

    res.json(recommendations);
  } catch (err) {
    console.error("Internship reco error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

exports.roleMatching = async (req, res) => {
  try {
    const { driveId } = req.params;
    const drive = await Drive.findById(driveId).lean();
    if (!drive) return res.status(404).json({ message: "Drive not found" });

    const candidates = await User.find({ role: "student" }).lean();
    const matches = getRoleMatching(drive, candidates);

    res.json({ matches });
  } catch (err) {
    console.error("Role matching error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};