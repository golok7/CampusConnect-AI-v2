const express = require("express");
const { TEXT_KEYWORDS, SKILL_ONTOLOGY, ALIAS_TO_CATEGORY } = require("../services/skills/skillOntology");
const { DOMAIN_RULES } = require("../services/semantic/ontology");

const router = express.Router();

// Returns TEXT_KEYWORDS as [[alias, displayName], ...] — consumed by Python ai-service at startup
router.get("/keywords", (req, res) => {
  res.json(TEXT_KEYWORDS);
});

// Returns DOMAIN_RULES keyed by domain name — consumed by Python ai-service at startup
router.get("/domains", (req, res) => {
  res.json(DOMAIN_RULES);
});

// Returns full SKILL_ONTOLOGY with category metadata — for richer Python-side categorization
router.get("/skills", (req, res) => {
  const result = {};
  for (const [category, skills] of Object.entries(SKILL_ONTOLOGY)) {
    result[category] = skills.map(({ display, aliases }) => ({ display, aliases }));
  }
  res.json(result);
});

module.exports = router;
