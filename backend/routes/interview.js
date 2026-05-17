const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/auth");
const rateLimiter = require("../middleware/rateLimiter");
const { getInterviewQuestions, evaluateMockInterview, getInterviewHistory } = require("../controllers/interviewController");

// Rate-limited: each Groq call costs tokens
router.post("/questions", auth, rateLimiter, getInterviewQuestions);

router.post("/evaluate", auth, rateLimiter, evaluateMockInterview);
router.get("/history", auth, getInterviewHistory);

module.exports = router;
