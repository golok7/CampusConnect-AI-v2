const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/auth");
const { searchUsersHandler } = require("../controllers/searchController");

// GET /search/users
// Authenticated — recruiters and faculty must be logged in.
// See searchController for full query param documentation.
router.get("/users", auth, searchUsersHandler);

module.exports = router;
