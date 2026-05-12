const express = require("express");
const router  = express.Router();

const auth                = require("../middleware/auth");
const { getProfileHandler } = require("../controllers/profileController");

// GET /users/:githubUsername/profile
router.get("/:githubUsername/profile", auth, getProfileHandler);

module.exports = router;
