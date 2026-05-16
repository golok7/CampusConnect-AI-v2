const express = require("express");
const router  = express.Router();

const auth                   = require("../middleware/auth");
const { getGithubData }      = require("../controllers/githubController");
const { getRateLimit }       = require("../services/github/githubClient");

router.post("/fetch", auth, getGithubData);

// GET /github/rate-limit — check remaining quota without consuming any requests
router.get("/rate-limit", async (req, res) => {
  try {
    const data      = await getRateLimit();
    const core      = data.resources?.core || {};
    const remaining = core.remaining ?? "?";
    const limit     = core.limit     ?? "?";
    const reset     = core.reset     ? new Date(core.reset * 1000).toLocaleTimeString() : "?";
    const tokenUsed = !!process.env.GITHUB_TOKEN;

    return res.json({
      remaining,
      limit,
      resetsAt:  reset,
      tokenUsed,
      status:    remaining === 0 ? "exhausted" : remaining < 100 ? "low" : "ok",
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;