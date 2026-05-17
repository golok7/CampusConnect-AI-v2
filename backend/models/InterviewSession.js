const mongoose = require("mongoose");

const evaluationSchema = new mongoose.Schema({
  score:        { type: Number, min: 0, max: 10 },
  feedback:     String,
  correctness:  { type: Number, min: 0, max: 10 },
  clarity:      { type: Number, min: 0, max: 10 },
  optimization: { type: Number, min: 0, max: 10 }, // DSA only
  edgeCases:    { type: Number, min: 0, max: 10 }, // DSA only
}, { _id: false });

const turnSchema = new mongoose.Schema({
  questionNumber: { type: Number, required: true },
  category:       { type: String, enum: ["technical", "dsa", "behavioral", "domain-fit", "followup"] },
  difficulty:     { type: Number, min: 1, max: 5, default: 3 },
  question:       { type: String, required: true },
  answer:         { type: String, default: null },
  isFollowup:     { type: Boolean, default: false },
  evaluation:     { type: evaluationSchema, default: null },
}, { _id: false });

const finalReportSchema = new mongoose.Schema({
  overallScore:    { type: Number, min: 0, max: 100 },
  grade:           { type: String, enum: ["A", "B", "C", "D", "F"] },
  strengths:       [String],
  weaknesses:      [String],
  recommendation:  String,
  categoryScores: {
    technical:   Number,
    dsa:         Number,
    behavioral:  Number,
    domainFit:   Number,
  },
}, { _id: false });

const interviewSessionSchema = new mongoose.Schema({
  // Who initiated (recruiter or student doing self-prep)
  initiatorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  // Whose profile is being evaluated
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  jobDescription:  { type: String, required: true },
  jobRole:         String,
  matchedSkills:   [String],
  missingSkills:   [String],

  turns:           { type: [turnSchema], default: [] },

  currentTurnIndex: { type: Number, default: 0 },
  totalTurns:       { type: Number, default: 8 },

  // Rolling average score (used for difficulty adaptation)
  avgScore: { type: Number, default: 0 },

  status: {
    type:    String,
    enum:    ["active", "completed", "abandoned"],
    default: "active",
  },

  finalReport: { type: finalReportSchema, default: null },
}, { timestamps: true });

interviewSessionSchema.index({ initiatorId: 1, createdAt: -1 });
interviewSessionSchema.index({ candidateId: 1, createdAt: -1 });
interviewSessionSchema.index({ status: 1 });

module.exports = mongoose.model("InterviewSession", interviewSessionSchema);
