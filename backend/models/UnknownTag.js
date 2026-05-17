// models/UnknownTag.js
// Stores raw tags from Groq that don't map to any known domain.
// Accumulates over time — when enough similar tags build up,
// discoverNewDomains() clusters them into candidate new domains.

const mongoose = require("mongoose");

const unknownTagSchema = new mongoose.Schema({
  tag: {
    type:     String,
    required: true,
    unique:   true,
    trim:     true,
    lowercase: true,
  },
  count: {
    type:    Number,
    default: 1,
  },
  repos: [{
    type: String,  // repo names that contained this tag
  }],
  firstSeen: {
    type:    Date,
    default: Date.now,
  },
  clusteredInto: {
    type:    String,  // domain key once clustered, null until then
    default: null,
  },
});

unknownTagSchema.index({ count: -1 });
unknownTagSchema.index({ clusteredInto: 1 });

module.exports = mongoose.model("UnknownTag", unknownTagSchema);