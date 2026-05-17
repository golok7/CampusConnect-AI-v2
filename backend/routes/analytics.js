const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/auth");
const { getGlobalAnalytics, getRecruiterAnalytics, getStudentAnalytics } = require("../controllers/analyticsController");

router.get("/global", auth, getGlobalAnalytics);
router.get("/recruiter", auth, getRecruiterAnalytics);
router.get("/student/:id", auth, getStudentAnalytics);

module.exports = router;
