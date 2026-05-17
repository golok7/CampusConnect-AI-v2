const Pipeline = require("../models/Pipeline");
const User     = require("../models/User");

const { VALID_STAGES } = Pipeline;

// ── POST /pipeline ─────────────────────────────────────────────────────────────
// Add a candidate to the recruiter's pipeline.
// Body: { candidateId, jobTitle, stage?, notes?, matchSnapshot? }
exports.addToPipeline = async (req, res) => {
  try {
    const recruiterId = req.user.id;
    const { candidateId, jobTitle, stage, notes, matchSnapshot, driveId } = req.body;

    if (!candidateId || !jobTitle?.trim()) {
      return res.status(400).json({ message: "candidateId and jobTitle are required" });
    }

    if (stage && !VALID_STAGES.includes(stage)) {
      return res.status(400).json({ message: `stage must be one of: ${VALID_STAGES.join(", ")}` });
    }

    // Verify candidate exists
    const candidate = await User.findById(candidateId).lean().select("_id name");
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    const filter = { recruiterId, candidateId, jobTitle: jobTitle.trim() };
    if (driveId) filter.driveId = driveId;

    const entry = await Pipeline.findOneAndUpdate(
      filter,
      {
        $setOnInsert: { recruiterId, candidateId, jobTitle: jobTitle.trim(), matchSnapshot: matchSnapshot || null, driveId: driveId || null },
        $set: {
          ...(stage  ? { stage }  : {}),
          ...(notes !== undefined ? { notes } : {}),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(201).json({ message: "Added to pipeline", entry });

  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "Candidate already in this pipeline. Use PATCH to update stage." });
    }
    console.error("Pipeline add error:", err.message);
    return res.status(500).json({ message: "Failed to add to pipeline" });
  }
};

// ── GET /pipeline ──────────────────────────────────────────────────────────────
// List the recruiter's pipeline. Optional ?stage=&jobTitle= filters.
exports.getPipeline = async (req, res) => {
  try {
    const recruiterId = req.user.id;
    const { stage, jobTitle, driveId } = req.query;

    if (stage && !VALID_STAGES.includes(stage)) {
      return res.status(400).json({ message: `stage must be one of: ${VALID_STAGES.join(", ")}` });
    }

    const filter = { recruiterId };
    if (stage)    filter.stage    = stage;
    if (jobTitle) filter.jobTitle = jobTitle.trim();
    if (driveId)  filter.driveId  = driveId;

    const entries = await Pipeline.find(filter)
      .sort({ updatedAt: -1 })
      .populate("candidateId", "name githubUsername branch year topDomains activityScore normalizedSkills")
      .populate("driveId", "title company type status")
      .lean();

    // Group by jobTitle for UI convenience
    const grouped = {};
    for (const entry of entries) {
      const key = entry.jobTitle;
      if (!grouped[key]) grouped[key] = { jobTitle: key, counts: {}, candidates: [] };
      grouped[key].candidates.push(entry);
      grouped[key].counts[entry.stage] = (grouped[key].counts[entry.stage] || 0) + 1;
    }

    return res.json({
      total: entries.length,
      groups: Object.values(grouped),
    });

  } catch (err) {
    console.error("Pipeline get error:", err.message);
    return res.status(500).json({ message: "Failed to fetch pipeline" });
  }
};

// ── PATCH /pipeline/:id ────────────────────────────────────────────────────────
// Update stage and/or notes for a pipeline entry.
exports.updatePipelineEntry = async (req, res) => {
  try {
    const recruiterId = req.user.id;
    const { id }      = req.params;
    const { stage, notes } = req.body;

    if (!stage && notes === undefined) {
      return res.status(400).json({ message: "Provide stage and/or notes to update" });
    }

    if (stage && !VALID_STAGES.includes(stage)) {
      return res.status(400).json({ message: `stage must be one of: ${VALID_STAGES.join(", ")}` });
    }

    const update = {};
    if (stage)            update.stage = stage;
    if (notes !== undefined) update.notes = notes;

    const entry = await Pipeline.findOneAndUpdate(
      { _id: id, recruiterId },
      { $set: update },
      { new: true }
    );

    if (!entry) {
      return res.status(404).json({ message: "Pipeline entry not found or not yours" });
    }

    return res.json({ message: "Updated", entry });

  } catch (err) {
    console.error("Pipeline update error:", err.message);
    return res.status(500).json({ message: "Failed to update pipeline entry" });
  }
};

// ── DELETE /pipeline/:id ───────────────────────────────────────────────────────
exports.removePipelineEntry = async (req, res) => {
  try {
    const recruiterId = req.user.id;
    const { id }      = req.params;

    const entry = await Pipeline.findOneAndDelete({ _id: id, recruiterId });

    if (!entry) {
      return res.status(404).json({ message: "Pipeline entry not found or not yours" });
    }

    return res.json({ message: "Removed from pipeline" });

  } catch (err) {
    console.error("Pipeline delete error:", err.message);
    return res.status(500).json({ message: "Failed to remove from pipeline" });
  }
};
