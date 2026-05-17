const express = require("express");
const multer  = require("multer");
const auth    = require("../middleware/auth");
const { uploadResume, downloadResume, improveResume } = require("../controllers/resumeController");

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const accepted = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (accepted.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

const router = express.Router();

router.post("/upload", auth, upload.single("resume"), uploadResume);

// GET /resume/download/:githubUsername — returns the original uploaded resume file
router.get("/download/:githubUsername", auth, downloadResume);

// POST /resume/improve — JD gap analysis + actionable improvement suggestions
const rateLimiter = require("../middleware/rateLimiter");
router.post("/improve", auth, rateLimiter, improveResume);

module.exports = router;
