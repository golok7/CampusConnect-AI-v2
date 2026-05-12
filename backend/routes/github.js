const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const { getGithubData } = require("../controllers/githubController");

router.post("/fetch", auth, getGithubData);

module.exports = router;