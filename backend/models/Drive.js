const mongoose = require("mongoose");

const driveSchema = new mongoose.Schema(
  {
    recruiterId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title:          { type: String, required: true, trim: true, maxlength: 200 },
    company:        { type: String, required: true, trim: true, maxlength: 100 },
    type:           { type: String, enum: ["placement", "internship", "hackathon"], required: true },
    description:    { type: String, required: true, maxlength: 5000 },
    requiredSkills: { type: [String], default: [] },
    domainScores:   { type: mongoose.Schema.Types.Mixed, default: {} },
    status:         { type: String, enum: ["active", "closed", "draft"], default: "active" },
    deadline:       { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Drive", driveSchema);
