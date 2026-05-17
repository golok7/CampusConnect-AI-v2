const express     = require("express");
const router      = express.Router();
const auth        = require("../middleware/auth");
const rateLimiter = require("../middleware/rateLimiter");
const {
  startSession,
  submitAnswer,
  getSession,
  listSessions,
  abandonSession,
  evaluateMockInterview,
  getInterviewHistory,
} = require("../controllers/interviewController");

// Start a new interview session — rate-limited (Groq call)
router.post("/session/start", auth, rateLimiter, startSession);

// Submit an answer and get the next question or final report — rate-limited
router.post("/session/:sessionId/answer", auth, rateLimiter, submitAnswer);

// Get full session state (transcript + report if done)
router.get("/session/:sessionId", auth, getSession);

// List sessions for the current user
router.get("/sessions", auth, listSessions);

// Abandon an active session
router.patch("/session/:sessionId/abandon", auth, abandonSession);

router.post("/evaluate", auth, rateLimiter, evaluateMockInterview);
router.get("/history", auth, getInterviewHistory);

module.exports = router;
