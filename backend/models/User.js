const mongoose = require("mongoose");

// Reusable sub-schema for a single semantic domain entry.
// _id: false — no Mongoose ID needed on array elements.
const domainEntrySchema = new mongoose.Schema({
  domain:  String,
  score:   Number,
  metrics: {
    repos:      { type: Number, default: 0 },
    commits:    { type: Number, default: 0 },
    stars:      { type: Number, default: 0 },
    activeDays: { type: Number, default: 0 },
  },
}, { _id: false });

const userSchema = new mongoose.Schema({
  name:     String,
  email:    { type: String, unique: true },
  password: String,

  role: {
    type:    String,
    enum:    ["student", "faculty", "recruiter"],
    default: "student",
  },

  branch: String,
  year:   Number,

  // ── Raw extracted technologies ───────────────────────────────────────────────
  // Powers recruiter filtering, exact skill matching, and search.
  // These are TECHNOLOGIES, not domains — keep them separate from topDomains.
  // Keys: domain names from githubService DOMAIN_RULES
  skills: {
    languages:  { type: [String], default: [] },
    frameworks: { type: [String], default: [] },
    libraries:  { type: [String], default: [] },
    databases:  { type: [String], default: [] },
    tools:      { type: [String], default: [] },
  },

  // Human-readable labels derived from topDomains (e.g. "Machine Learning")
  interests: [String],

  githubUsername: String,

  // ── Semantic domain intelligence ─────────────────────────────────────────────
  // Top 5 contribution-weighted semantic domains.
  // Powers ranking, recommendations, team formation, and project matching.
  // Kept at root level for fast queries without nested field access.
  //
  // ⚠️  Keep in sync with selectDiverseTopDomains() in githubController.js
  //     and buildVector() in recommendationService.js.
  topDomains: {
    type:     [domainEntrySchema],
    default:  [],
    validate: { validator: v => v.length <= 5, message: "topDomains may not exceed 5 entries" },
  },

  // ── GitHub metadata ───────────────────────────────────────────────────────────
  // ⚠️  Keep in sync with the return value of fetchGithubData() in githubService.js
  //     and with the githubData block written in githubController.js.
  githubData: {
    languages:      [String],
    repos:          { type: Array, default: [] },

    // Aggregate GitHub stats
    stars:        { type: Number, default: 0 },
    totalRepos:   { type: Number, default: 0 },
    processedRepos: { type: Number, default: 0 },
    totalCommits: { type: Number, default: 0 },   // populated when githubService exposes it
    totalPRs:     { type: Number, default: 0 },   // populated when githubService exposes it
    activeDays:   { type: Number, default: 0 },   // populated when githubService exposes it
    teamworkScore:{ type: Number, default: 0 },   // teamwork score based on collaboration

    // Breakdown of repo classifications from Phase 1 of githubService
    repoTypeCounts: {
      project: { type: Number, default: 0 },
      fork:    { type: Number, default: 0 },
      dsa:     { type: Number, default: 0 },
      course:  { type: Number, default: 0 },
      content: { type: Number, default: 0 },
      config:  { type: Number, default: 0 },
      noise:   { type: Number, default: 0 },
    },

    // Per-repo summaries — populated by githubController from githubService repo output.
    repoSummaries: {
      type: [{
        repoName:       String,
        dominantDomain: String,
        semanticScore:  Number,
        description:    String,
        domains:        { type: Map, of: Number, default: {} },
        depthScore:     { type: Number, default: 0 },
      }],
      default: [],
      _id: false,
    },

    // Weighted repo activity score (sum of repoActivityScore × typeWeight)
    activityScore: { type: Number, default: 0 },

    // ── Collaboration intelligence ─────────────────────────────────────────
    collaborationData: {
      totalPRs:            { type: Number, default: 0 },
      mergedPRs:           { type: Number, default: 0 },
      mergeRate:           { type: Number, default: 0 }, // 0.0–1.0
      collaboratedRepos:   { type: Number, default: 0 }, // repos where user is contributor, not owner
      uniqueCollaborators: { type: Number, default: 0 }, // unique people who co-work on user's repos
      collaborationScore:  { type: Number, default: 0 }, // 0–100
      teamworkScore:       { type: Number, default: 0 }, // 0–100
    },

    // Scoring pipeline used: "semantic+voyage-4-lite" or "keyword-only"
    scoringMode: { type: String, default: "keyword-only" },

    // Ontology version tag — bump when DOMAIN_RULES / prototypes change significantly
    // so stale profiles can be identified and reprocessed.
    semanticVersion: { type: String, default: "v1" },

    // Full normalized domain score vector — all domains, not just top 5.
    // Stored for future use by recommendation/similarity engines that need
    // a complete vector rather than the sparse topDomains array.
    domainScores: { type: Map, of: Number, default: {} },
  },

  // Root-level activity score (same as githubData.activityScore).
  // Kept at root for fast sorting without nested field access.
  activityScore: { type: Number, default: 0 },

  // Full domain score vector — ALL domains, not just top 5.
  // Root-level so domain-specific queries and recommendation engines can access
  // mlops, cybersecurity, embedded, etc. without touching the nested githubData blob.
  domainScores: { type: Map, of: Number, default: {} },

  // Flattened, lowercased skill tokens for fast $in retrieval during search.
  // Rebuilt on every GitHub fetch from skills.* — do not edit manually.
  // GitHub-only: resume skills are stored separately in resumeNormalizedSkills.
  normalizedSkills: { type: [String], default: [] },

  // ── Resume skills (kept separate from GitHub skills) ─────────────────────────
  // Categorized skills extracted by the Python resume parser.
  resumeSkills: {
    languages:  { type: [String], default: [] },
    frameworks: { type: [String], default: [] },
    libraries:  { type: [String], default: [] },
    databases:  { type: [String], default: [] },
    tools:      { type: [String], default: [] },
  },

  // Flattened resume skill tokens for $in matching during search.
  // Includes ontology-matched display names + raw unknown skills from resume
  // (e.g. "dsa", "penetration testing") that may not be in the ontology.
  resumeNormalizedSkills: { type: [String], default: [] },

  // Original uploaded resume file stored for download.
  resumeFile: {
    data:         Buffer,
    contentType:  String,
    originalName: String,
  },

  // Full structured output from the Resume Intelligence microservice.
  // Stored as Mixed to avoid schema coupling with the Python service response.
  resumeData: { type: mongoose.Schema.Types.Mixed, default: null },

  // Cached stats from Mock Interviews
  mockInterviewStats: {
    totalInterviews: { type: Number, default: 0 },
    avgOverallScore: { type: Number, default: 0 },
    avgDsaScore: { type: Number, default: 0 },
    avgCommunicationScore: { type: Number, default: 0 }
  },

}, { timestamps: true });

// ── Indexes ───────────────────────────────────────────────────────────────────
// Skills arrays — for recruiter exact-match filtering
userSchema.index({ "skills.languages":  1 });
userSchema.index({ "skills.frameworks": 1 });
userSchema.index({ "skills.libraries":  1 });
userSchema.index({ "skills.databases":  1 });
userSchema.index({ "skills.tools":      1 });
// Semantic domain index — for domain-filtered leaderboard / search queries
userSchema.index({ "topDomains.domain": 1 });
// Activity sort — for leaderboard and recruiter "most active" sorting
userSchema.index({ activityScore: -1 });
// Normalized skills — for broad $in candidate retrieval during search
userSchema.index({ normalizedSkills: 1 });
userSchema.index({ resumeNormalizedSkills: 1 });
// Domain score indexes — for recruiter / faculty filtering on non-top-5 domains
userSchema.index({ "domainScores.mlops":               1 });
userSchema.index({ "domainScores.cybersecurity":       1 });
userSchema.index({ "domainScores.embedded":            1 });
userSchema.index({ "domainScores.distributed_systems": 1 });
userSchema.index({ "domainScores.blockchain":          1 });
userSchema.index({ "domainScores.data_science":        1 });
userSchema.index({ "domainScores.networking":          1 });
userSchema.index({ "domainScores.algorithms":          1 });

module.exports = mongoose.model("User", userSchema);
