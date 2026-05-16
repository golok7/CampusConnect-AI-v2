const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/auth");
const rateLimiter = require("../middleware/rateLimiter");
const { getInterviewQuestions } = require("../controllers/interviewController");

// Rate-limited: each Groq call costs tokens
router.post("/questions", auth, rateLimiter, getInterviewQuestions);

module.exports = router;
