const express = require("express");
const router  = express.Router();
const PendingDomain = require("../models/PendingDomain");
const UnknownTag    = require("../models/UnknownTag");
// discoverNewDomains is not yet implemented in githubService — stub for future use

// GET /admin/pending-domains — view candidate new domains
router.get("/pending-domains", async (req, res) => {
  const pending = await PendingDomain.find({ status: "pending" })
    .sort({ confidence: -1 });
  res.json(pending);
});

// GET /admin/unknown-tags — see what's accumulating
router.get("/unknown-tags", async (req, res) => {
  const tags = await UnknownTag.find({ clusteredInto: null })
    .sort({ count: -1 })
    .limit(50);
  res.json(tags);
});

// POST /admin/approve-domain/:key
router.post("/approve-domain/:key", async (req, res) => {
  await PendingDomain.updateOne(
    { key: req.params.key },
    { status: "approved", reviewedAt: new Date(), reviewNote: req.body.note }
  );
  res.json({ message: `Domain "${req.params.key}" approved — add it to githubService.js manually` });
});

// POST /admin/reject-domain/:key
router.post("/reject-domain/:key", async (req, res) => {
  await PendingDomain.updateOne(
    { key: req.params.key },
    { status: "rejected", reviewedAt: new Date() }
  );
  res.json({ message: `Domain "${req.params.key}" rejected` });
});

// POST /admin/run-discovery — placeholder until discoverNewDomains is implemented
router.post("/run-discovery", async (req, res) => {
  res.status(501).json({ message: "Domain discovery not yet implemented" });
});

module.exports = router;