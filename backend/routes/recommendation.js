const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const { recommendUsers, recommendJobs, recommendInternships, roleMatching } = require("../controllers/recommendationController");

router.get("/users", auth, recommendUsers);
router.get("/jobs", auth, recommendJobs);
router.get("/internships", auth, recommendInternships);
router.get("/candidates/:driveId", auth, roleMatching);

module.exports = router;