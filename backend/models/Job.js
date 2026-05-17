const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema({
  // Who posted this job (recruiter)
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  title:       { type: String, required: true, trim: true },
  company:     { type: String, required: true, trim: true },
  description: { type: String, required: true },
  location:    { type: String, default: "Remote" },
  type:        { type: String, enum: ["internship", "full-time", "part-time", "contract"], default: "internship" },

  // Structured requirements — populated by the job posting flow or JD parser
  requiredSkills:   { type: [String], default: [] },
  preferredSkills:  { type: [String], default: [] },
  requiredDomains:  { type: [String], default: [] },

  // Normalized domain relevance vector (17 domains, same as candidate domainScores)
  // Computed at post time by the JD parser so recommendation can do vector dot-product.
  domainVector: { type: Map, of: Number, default: {} },

  stipend:     String,
  duration:    String,  // e.g. "3 months", "6 months"
  applyLink:   String,
  deadline:    Date,

  active: { type: Boolean, default: true },
}, { timestamps: true });

jobSchema.index({ active: 1, createdAt: -1 });
jobSchema.index({ requiredDomains: 1 });
jobSchema.index({ type: 1 });
jobSchema.index({ postedBy: 1 });

module.exports = mongoose.model("Job", jobSchema);
