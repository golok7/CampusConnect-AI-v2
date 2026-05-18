const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/auth");
const { createDrive, getDrives, getDrive, updateDrive, closeDrive, applyToDrive, getStudentDrives } = require("../controllers/driveController");

router.post("/",                 auth, createDrive);
router.get("/",                  auth, getDrives);
router.get("/student/active",    auth, getStudentDrives);
router.post("/:id/apply",        auth, applyToDrive);
router.get("/:id",               auth, getDrive);
router.patch("/:id",             auth, updateDrive);
router.patch("/:id/close",       auth, closeDrive);

module.exports = router;
