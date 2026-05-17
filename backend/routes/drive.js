const express = require("express");
const { createDrive, getDrives } = require("../controllers/driveController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.post("/", createDrive);
router.get("/", getDrives);

module.exports = router;
