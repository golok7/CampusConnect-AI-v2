const User = require("../models/User");
const Job  = require("../models/Job");
const { recommendJobs, postJob } = require("../services/jobRecommendationService");

// ── POST /jobs — recruiter posts a job ───────────────────────────────────────
exports.createJob = async (req, res) => {
  try {
    if (req.user.role !== "recruiter") {
      return res.status(403).json({ message: "Only recruiters can post jobs" });
    }

    const { title, company, description } = req.body;
    if (!title || !company || !description) {
      return res.status(400).json({ message: "title, company, and description are required" });
    }
    if (description.length < 50) {
      return res.status(400).json({ message: "description must be at least 50 characters" });
    }

    const job = await postJob(req.user.id, req.body);
    return res.status(201).json({ job });
  } catch (err) {
    console.error("Job create error:", err.message);
    return res.status(500).json({ message: "Failed to create job" });
  }
};

// ── GET /jobs — list active jobs with optional type filter ───────────────────
exports.listJobs = async (req, res) => {
  try {
    const { type, limit = 50 } = req.query;
    const filter = { active: true };
    if (type) filter.type = type;

    const jobs = await Job.find(filter, {
      title: 1, company: 1, type: 1, location: 1, stipend: 1,
      duration: 1, deadline: 1, applyLink: 1, requiredSkills: 1,
      preferredSkills: 1, requiredDomains: 1,
      description: { $substr: ["$description", 0, 300] },
      createdAt: 1,
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10))
      .lean();

    return res.json({ jobs });
  } catch (err) {
    console.error("Job list error:", err.message);
    return res.status(500).json({ message: "Failed to fetch jobs" });
  }
};

// ── GET /jobs/recommendations — personalised job matches for the current user ─
exports.getRecommendations = async (req, res) => {
  try {
    const { type, limit = 10 } = req.query;

    const user = await User.findById(req.user.id)
      .select("normalizedSkills resumeNormalizedSkills topDomains domainScores activityScore")
      .lean();

    if (!user) return res.status(404).json({ message: "User not found" });

    const results = await recommendJobs(user, {
      limit: Math.min(parseInt(limit, 10) || 10, 50),
      type:  type || null,
    });

    return res.json({ recommendations: results });
  } catch (err) {
    console.error("Job recommendation error:", err.message);
    return res.status(500).json({ message: "Failed to generate recommendations" });
  }
};

// ── GET /jobs/:id — single job detail ────────────────────────────────────────
exports.getJob = async (req, res) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, active: true })
      .populate("postedBy", "name")
      .lean();
    if (!job) return res.status(404).json({ message: "Job not found" });
    return res.json({ job });
  } catch (err) {
    console.error("Job get error:", err.message);
    return res.status(500).json({ message: "Failed to fetch job" });
  }
};

// ── PATCH /jobs/:id — recruiter updates or deactivates their job ─────────────
exports.updateJob = async (req, res) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, postedBy: req.user.id });
    if (!job) return res.status(404).json({ message: "Job not found or not yours" });

    const allowed = ["title", "company", "description", "location", "type", "stipend", "duration", "applyLink", "deadline", "active", "requiredSkills", "preferredSkills"];
    for (const key of allowed) {
      if (req.body[key] !== undefined) job[key] = req.body[key];
    }
    await job.save();
    return res.json({ job });
  } catch (err) {
    console.error("Job update error:", err.message);
    return res.status(500).json({ message: "Failed to update job" });
  }
};
