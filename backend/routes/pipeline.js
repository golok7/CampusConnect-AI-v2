const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/auth");
const {
  addToPipeline,
  getPipeline,
  updatePipelineEntry,
  removePipelineEntry,
} = require("../controllers/pipelineController");

// All pipeline routes require authentication
router.post(  "/",    auth, addToPipeline);
router.get(   "/",    auth, getPipeline);
router.patch( "/:id", auth, updatePipelineEntry);
router.delete("/:id", auth, removePipelineEntry);

module.exports = router;
