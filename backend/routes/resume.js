const express = require("express");
const multer  = require("multer");
const auth    = require("../middleware/auth");
const { uploadResume } = require("../controllers/resumeController");

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

module.exports = router;
