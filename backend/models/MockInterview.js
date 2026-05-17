const mongoose = require("mongoose");

const mockInterviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  driveId: { type: mongoose.Schema.Types.ObjectId, ref: "PlacementDrive", default: null },
  jobTitle: { type: String, default: "" },
  overallScore: { type: Number, default: 0 },
  dsaScore: { type: Number, default: 0 },
  communicationScore: { type: Number, default: 0 },
  feedback: { type: String, default: "" },
  history: [{
    question: String,
    answer: String,
    score: Number,
    feedback: String
  }]
}, { timestamps: true });

mockInterviewSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("MockInterview", mockInterviewSchema);
