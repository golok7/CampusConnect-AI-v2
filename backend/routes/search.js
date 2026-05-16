const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/auth");
const rateLimiter = require("../middleware/rateLimiter");
const { searchUsersHandler, semanticSearchHandler } = require("../controllers/searchController");

// GET /search/users — filter-based structured search
router.get("/users", auth, searchUsersHandler);

// POST /search/semantic — natural-language JD search
// Rate-limited to 10 req/min per IP to control Voyage API costs.
router.post("/semantic", auth, rateLimiter, semanticSearchHandler);

module.exports = router;
