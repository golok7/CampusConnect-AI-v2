const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/auth");
const rateLimiter = require("../middleware/rateLimiter");
const { searchUsersHandler, semanticSearchHandler, unifiedSearchHandler } = require("../controllers/searchController");

// GET /search/users — filter-based structured search (legacy, kept for compatibility)
router.get("/users", auth, searchUsersHandler);

// POST /search — unified: domain filters + optional free-text query in one call
// Rate-limited because it may call Groq + Voyage when a query is provided.
router.post("/", auth, rateLimiter, unifiedSearchHandler);

// POST /search/semantic — legacy semantic-only endpoint
router.post("/semantic", auth, rateLimiter, semanticSearchHandler);

module.exports = router;
