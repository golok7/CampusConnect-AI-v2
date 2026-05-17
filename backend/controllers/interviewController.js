const User = require("../models/User");
const MockInterview = require("../models/MockInterview");
const { generateInterviewQuestions, evaluateInterview } = require("../services/interviewService");

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

// ── POST /interview/evaluate ──────────────────────────────────────────────────
// Body: { questions: Array<{question: string, category: string}>, answers: string[], jobTitle?: string, driveId?: string }
exports.evaluateMockInterview = async (req, res) => {
  try {
    const { questions, answers, jobTitle, driveId } = req.body;
    
    if (!questions || !answers || !Array.isArray(questions) || !Array.isArray(answers) || questions.length !== answers.length) {
      return res.status(400).json({ message: "Questions and answers arrays must be provided and have the same length" });
    }

    const evaluation = await evaluateInterview(questions, answers);
    
    const mockInterview = new MockInterview({
      userId: req.user.id,
      jobTitle: jobTitle || "",
      driveId: driveId || null,
      overallScore: evaluation.overallScore,
      dsaScore: evaluation.dsaScore,
      communicationScore: evaluation.communicationScore,
      feedback: evaluation.feedback,
      history: evaluation.history
    });
    await mockInterview.save();
    
    // Update user stats
    const user = await User.findById(req.user.id);
    if (user) {
      const stats = user.mockInterviewStats || { totalInterviews: 0, avgOverallScore: 0, avgDsaScore: 0, avgCommunicationScore: 0 };
      const total = stats.totalInterviews || 0;
      
      stats.avgOverallScore = ((stats.avgOverallScore * total) + evaluation.overallScore) / (total + 1);
      stats.avgDsaScore = ((stats.avgDsaScore * total) + evaluation.dsaScore) / (total + 1);
      stats.avgCommunicationScore = ((stats.avgCommunicationScore * total) + evaluation.communicationScore) / (total + 1);
      stats.totalInterviews = total + 1;
      
      user.mockInterviewStats = stats;
      await user.save();
    }

    return res.json(mockInterview);
  } catch (err) {
    console.error("Interview evaluation error:", err.message);
    const isGroqError = err.message.includes("Groq") || err.message.includes("GROQ");
    return res.status(isGroqError ? 502 : 500).json({ 
      message: isGroqError ? "AI service unavailable — try again shortly" : "Failed to evaluate interview" 
    });
  }
};

// ── GET /interview/history ────────────────────────────────────────────────────
// Query params: userId (optional, required if role is recruiter to see student's history)
exports.getInterviewHistory = async (req, res) => {
  try {
    const targetUserId = req.query.userId && req.user.role !== "student" ? req.query.userId : req.user.id;
    
    const history = await MockInterview.find({ userId: targetUserId })
      .populate("driveId", "title company")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
      
    return res.json(history);
  } catch (err) {
    console.error("Fetch history error:", err.message);
    return res.status(500).json({ message: "Failed to fetch interview history" });
  }
};
