const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/auth");
const {
  createJob,
  listJobs,
  getRecommendations,
  getJob,
  updateJob,
} = require("../controllers/jobController");

// GET  /jobs/recommendations — personalised matches for logged-in student
router.get("/recommendations", auth, getRecommendations);

// GET  /jobs — browse all active jobs
router.get("/", auth, listJobs);

// GET  /jobs/:id — single job detail
router.get("/:id", auth, getJob);

// POST /jobs — recruiter posts a new job (JD auto-parsed for skills + domain vector)
router.post("/", auth, createJob);

// PATCH /jobs/:id — recruiter updates/deactivates their job
router.patch("/:id", auth, updateJob);

module.exports = router;
