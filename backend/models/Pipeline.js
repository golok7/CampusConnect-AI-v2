const mongoose = require("mongoose");

const VALID_STAGES = ["shortlisted", "interviewing", "offered", "rejected"];

const pipelineSchema = new mongoose.Schema(
  {
    recruiterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    jobTitle:    { type: String, required: true, trim: true, maxlength: 200 },
    stage:       { type: String, enum: VALID_STAGES, default: "shortlisted" },
    notes:       { type: String, maxlength: 2000, default: "" },
    // Reference to a specific PlacementDrive (optional to support legacy pipelines without drives)
    driveId:     { type: String, default: null },
    // Snapshot of whyMatched at the time of shortlisting (avoids re-query)
    matchSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

// One candidate can only appear once per recruiter × jobTitle pipeline
pipelineSchema.index({ recruiterId: 1, candidateId: 1, jobTitle: 1, driveId: 1 }, { unique: true });

const Pipeline = mongoose.model("Pipeline", pipelineSchema);
Pipeline.VALID_STAGES = VALID_STAGES;

module.exports = Pipeline;
