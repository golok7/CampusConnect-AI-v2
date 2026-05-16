const User = require("../models/User");
const { generateInterviewQuestions } = require("../services/interviewService");

// ── POST /interview/questions ──────────────────────────────────────────────────
// Body: { candidateId, jobDescription, matchedSkills?, missingSkills? }
//
// matchedSkills / missingSkills can be passed directly from a search result's
// whyMatched field to avoid a round-trip. If omitted they default to empty arrays.
exports.getInterviewQuestions = async (req, res) => {
  try {
    const { candidateId, jobDescription, matchedSkills = [], missingSkills = [] } = req.body;

    if (!candidateId) {
      return res.status(400).json({ message: "candidateId is required" });
    }

    if (!jobDescription || typeof jobDescription !== "string" || jobDescription.trim().length < 20) {
      return res.status(400).json({ message: "jobDescription must be at least 20 characters" });
    }

    if (jobDescription.length > 3000) {
      return res.status(400).json({ message: "jobDescription must not exceed 3000 characters" });
    }

    const candidate = await User.findById(candidateId)
      .lean()
      .select("name normalizedSkills topDomains activityScore resumeData");

    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    const result = await generateInterviewQuestions(
      candidate,
      jobDescription.trim(),
      matchedSkills,
      missingSkills,
    );

    return res.json({
      candidateId,
      candidateName: candidate.name,
      questions: result.questions,
    });

  } catch (err) {
    console.error("Interview questions error:", err.message);
    const isGroqError = err.message.includes("Groq") || err.message.includes("GROQ");
    return res.status(isGroqError ? 502 : 500).json({
      message: isGroqError ? "AI service unavailable — try again shortly" : "Failed to generate questions",
    });
  }
};
