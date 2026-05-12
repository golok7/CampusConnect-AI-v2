const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/auth");
const { getLeaderboard } = require("../services/leaderboardService");

router.get("/", auth, async (req, res) => {
  try {
    const leaderboard = await getLeaderboard();
    res.json(leaderboard);
  } catch (err) {
    console.error("Leaderboard error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;