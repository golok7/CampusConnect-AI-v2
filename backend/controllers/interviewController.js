const User = require("../models/User");
const MockInterview = require("../models/MockInterview");
const {
  startInterview,
  submitAnswer,
  getSession,
  listSessions,
  abandonSession,
  evaluateInterview,
} = require("../services/interviewService");

function handleError(res, err) {
  console.error("Interview error:", err.message);
  const status = err.status || (err.message.includes("Groq") ? 502 : 500);
  res.status(status).json({ message: err.message || "Interview service error" });
}

// ── POST /interview/session/start ─────────────────────────────────────────────
// Body: { candidateId, jobDescription, matchedSkills?, missingSkills?, totalQuestions? }
exports.startSession = async (req, res) => {
  try {
    const {
      candidateId,
      jobDescription,
      matchedSkills  = [],
      missingSkills  = [],
      totalQuestions = 8,
    } = req.body;

    if (!candidateId) return res.status(400).json({ message: "candidateId is required" });
    if (!jobDescription || jobDescription.trim().length < 20) {
      return res.status(400).json({ message: "jobDescription must be at least 20 characters" });
    }
    if (totalQuestions < 4 || totalQuestions > 15) {
      return res.status(400).json({ message: "totalQuestions must be between 4 and 15" });
    }

    const candidate = await User.findById(candidateId)
      .select("name normalizedSkills resumeNormalizedSkills topDomains activityScore resumeData")
      .lean();

    if (!candidate) return res.status(404).json({ message: "Candidate not found" });

    const result = await startInterview(
      req.user.id,
      candidate,
      jobDescription.trim(),
      matchedSkills,
      missingSkills,
      totalQuestions,
    );

    return res.status(201).json(result);
  } catch (err) {
    handleError(res, err);
  }
};

// ── POST /interview/session/:sessionId/answer ─────────────────────────────────
// Body: { answer }
exports.submitAnswer = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { answer } = req.body;

    if (!answer || typeof answer !== "string" || answer.trim().length < 1) {
      return res.status(400).json({ message: "answer is required" });
    }
    if (answer.length > 5000) {
      return res.status(400).json({ message: "answer must not exceed 5000 characters" });
    }

    const result = await submitAnswer(sessionId, req.user.id, answer);
    return res.json(result);
  } catch (err) {
    handleError(res, err);
  }
};

// ── GET /interview/session/:sessionId ─────────────────────────────────────────
exports.getSession = async (req, res) => {
  try {
    const session = await getSession(req.params.sessionId, req.user.id);
    return res.json(session);
  } catch (err) {
    handleError(res, err);
  }
};

// ── GET /interview/sessions ───────────────────────────────────────────────────
exports.listSessions = async (req, res) => {
  try {
    const sessions = await listSessions(req.user.id);
    return res.json({ sessions });
  } catch (err) {
    handleError(res, err);
  }
};

// ── PATCH /interview/session/:sessionId/abandon ───────────────────────────────
exports.abandonSession = async (req, res) => {
  try {
    const result = await abandonSession(req.params.sessionId, req.user.id);
    return res.json(result);
  } catch (err) {
    handleError(res, err);
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
