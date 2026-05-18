const Drive    = require("../models/Drive");
const Pipeline = require("../models/Pipeline");
const User     = require("../models/User");

// ── POST /drives ───────────────────────────────────────────────────────────────
exports.createDrive = async (req, res) => {
  try {
    const { title, company, type, description, requiredSkills, domainScores, deadline, eligibility } = req.body;

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
      eligibility:    eligibility    || {},
    });

    return res.status(201).json({ message: "Drive created", drive });
  } catch (err) {
    console.error("Create drive error:", err.message);
    return res.status(500).json({ message: "Failed to create drive" });
  }
};

// ── GET /drives/student — active drives for students ──────────────────────────
exports.getStudentDrives = async (req, res) => {
  try {
    const studentId = req.user.id;
    const drives = await Drive.find({ status: "active" })
      .sort({ createdAt: -1 })
      .lean();

    const result = drives.map(d => ({
      ...d,
      applied: d.applications?.some(a => a.studentId?.toString() === studentId),
      applicationCount: d.applications?.length || 0,
    }));

    return res.json(result);
  } catch (err) {
    console.error("Get student drives error:", err.message);
    return res.status(500).json({ message: "Failed to fetch drives" });
  }
};

// ── POST /drives/:id/apply — student applies ──────────────────────────────────
exports.applyToDrive = async (req, res) => {
  try {
    const studentId = req.user.id;
    const drive = await Drive.findOne({ _id: req.params.id, status: "active" });
    if (!drive) return res.status(404).json({ message: "Drive not found or closed" });

    const alreadyApplied = drive.applications.some(a => a.studentId?.toString() === studentId);
    if (alreadyApplied) return res.status(409).json({ message: "Already applied" });

    drive.applications.push({ studentId, appliedAt: new Date() });
    await drive.save();

    return res.json({ message: "Application submitted" });
  } catch (err) {
    console.error("Apply to drive error:", err.message);
    return res.status(500).json({ message: "Failed to apply" });
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

    const result = drives.map(d => ({
      ...d,
      candidateCounts: countMap[d._id.toString()],
      applicationCount: d.applications?.length || 0,
    }));
    return res.json(result);
  } catch (err) {
    console.error("Get drives error:", err.message);
    return res.status(500).json({ message: "Failed to fetch drives" });
  }
};

// ── GET /drives/:id ────────────────────────────────────────────────────────────
exports.getDrive = async (req, res) => {
  try {
    const userId = req.user.id;
    const drive  = await Drive.findById(req.params.id).lean();
    if (!drive) return res.status(404).json({ message: "Drive not found" });

    const isOwner = drive.recruiterId?.toString() === userId;

    // Recruiters get full pipeline + applicants; students get drive info + apply status
    if (!isOwner) {
      const applied = drive.applications?.some(a => a.studentId?.toString() === userId);
      return res.json({ ...drive, applied, candidates: [], applicants: [] });
    }

    const [pipelines, applicantProfiles] = await Promise.all([
      Pipeline.find({ driveId: drive._id })
        .populate("candidateId", "name githubUsername topDomains activityScore normalizedSkills branch year")
        .lean(),
      User.find(
        { _id: { $in: (drive.applications || []).map(a => a.studentId) } },
        "name githubUsername topDomains activityScore normalizedSkills branch year"
      ).lean(),
    ]);

    const profileMap = {};
    for (const p of applicantProfiles) profileMap[p._id.toString()] = p;

    const applicants = (drive.applications || []).map(a => ({
      ...a,
      student: profileMap[a.studentId?.toString()] || null,
    }));

    return res.json({ ...drive, candidates: pipelines, applicants });
  } catch (err) {
    console.error("Get drive error:", err.message);
    return res.status(500).json({ message: "Failed to fetch drive" });
  }
};

// ── PATCH /drives/:id ──────────────────────────────────────────────────────────
exports.updateDrive = async (req, res) => {
  try {
    const allowed = ["title", "company", "description", "requiredSkills", "domainScores", "deadline", "status", "eligibility"];
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
