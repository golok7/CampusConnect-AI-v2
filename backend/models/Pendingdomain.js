// models/PendingDomain.js
// Candidate new domains discovered by discoverNewDomains().
// Admin reviews and approves/rejects before they go live.
// On approval: add to KNOWN_DOMAINS + DOMAIN_DESCRIPTIONS in githubService.js,
//              add to DOMAIN_INTEREST_MAP in githubController.js,
//              and re-score affected users.

const mongoose = require("mongoose");

const pendingDomainSchema = new mongoose.Schema({
  key: {
    type:     String,
    required: true,
    unique:   true,
    trim:     true,
  },
  label: {
    type:     String,
    required: true,
  },
  description: {
    type: String,
  },
  suggestedTags: [{
    type: String,
  }],
  affectedUsers: {
    type:    Number,
    default: 0,
  },
  affectedRepos: {
    type:    Number,
    default: 0,
  },
  confidence: {
    type: Number,  // 0.0 - 1.0, Groq's confidence
  },
  status: {
    type:    String,
    enum:    ["pending", "approved", "rejected"],
    default: "pending",
  },
  discoveredAt: {
    type:    Date,
    default: Date.now,
  },
  reviewedAt: {
    type: Date,
  },
  reviewNote: {
    type: String,  // admin note on approval/rejection
  },
});

pendingDomainSchema.index({ status: 1 });
pendingDomainSchema.index({ confidence: -1 });

module.exports = mongoose.model("PendingDomain", pendingDomainSchema);