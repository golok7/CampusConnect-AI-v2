const Drive    = require("../models/Drive");
const Pipeline = require("../models/Pipeline");

// ── POST /drives ───────────────────────────────────────────────────────────────
exports.createDrive = async (req, res) => {
  try {
    const { title, company, type, description, requiredSkills, domainScores, deadline } = req.body;

    if (!title || !company || !type || !description) {
      return res.status(400).json({ message: "title, company, type, and description are required" });
    }

    const drive = await Drive.create({
      recruiterId: req.user.id,
      title:          title.trim(),
      company:        company.trim(),
      type,
      description:    description.trim(),
      requiredSkills: requiredSkills || [],
      domainScores:   domainScores   || {},
      deadline:       deadline       || null,
    });

    return res.status(201).json({ message: "Drive created", drive });
  } catch (err) {
    console.error("Create drive error:", err.message);
    return res.status(500).json({ message: "Failed to create drive" });
  }
};

// ── GET /drives ────────────────────────────────────────────────────────────────
exports.getDrives = async (req, res) => {
  try {
    const drives = await Drive.find({ recruiterId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    const driveIds = drives.map(d => d._id);

    // Aggregate candidate counts per stage for each drive
    const pipelines = await Pipeline.find({ driveId: { $in: driveIds } })
      .select("driveId stage")
      .lean();

    const countMap = {};
    for (const d of drives) {
      countMap[d._id.toString()] = { shortlisted: 0, interviewing: 0, offered: 0, rejected: 0 };
    }
    for (const p of pipelines) {
      const key = p.driveId?.toString();
      if (key && countMap[key]) countMap[key][p.stage] = (countMap[key][p.stage] || 0) + 1;
    }

    const result = drives.map(d => ({ ...d, candidateCounts: countMap[d._id.toString()] }));
    return res.json(result);
  } catch (err) {
    console.error("Get drives error:", err.message);
    return res.status(500).json({ message: "Failed to fetch drives" });
  }
};

// ── GET /drives/:id ────────────────────────────────────────────────────────────
exports.getDrive = async (req, res) => {
  try {
    const drive = await Drive.findOne({ _id: req.params.id, recruiterId: req.user.id }).lean();
    if (!drive) return res.status(404).json({ message: "Drive not found" });

    const pipelines = await Pipeline.find({ driveId: drive._id })
      .populate("candidateId", "name githubUsername topDomains activityScore normalizedSkills branch year")
      .lean();

    return res.json({ ...drive, candidates: pipelines });
  } catch (err) {
    console.error("Get drive error:", err.message);
    return res.status(500).json({ message: "Failed to fetch drive" });
  }
};

// ── PATCH /drives/:id ──────────────────────────────────────────────────────────
exports.updateDrive = async (req, res) => {
  try {
    const allowed = ["title", "company", "description", "requiredSkills", "domainScores", "deadline", "status"];
    const update  = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    const drive = await Drive.findOneAndUpdate(
      { _id: req.params.id, recruiterId: req.user.id },
      { $set: update },
      { new: true }
    );

    if (!drive) return res.status(404).json({ message: "Drive not found" });
    return res.json({ message: "Drive updated", drive });
  } catch (err) {
    console.error("Update drive error:", err.message);
    return res.status(500).json({ message: "Failed to update drive" });
  }
};

// ── PATCH /drives/:id/close ────────────────────────────────────────────────────
exports.closeDrive = async (req, res) => {
  try {
    const drive = await Drive.findOneAndUpdate(
      { _id: req.params.id, recruiterId: req.user.id },
      { $set: { status: "closed" } },
      { new: true }
    );
    if (!drive) return res.status(404).json({ message: "Drive not found" });
    return res.json({ message: "Drive closed", drive });
  } catch (err) {
    console.error("Close drive error:", err.message);
    return res.status(500).json({ message: "Failed to close drive" });
  }
};
