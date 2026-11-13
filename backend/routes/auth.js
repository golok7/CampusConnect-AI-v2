const express = require("express");
const router = express.Router();

const { register, login, demo } = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);

// Demo / recruiter-view mode (sign-in disabled). Turn off by setting DEMO_MODE=false on the server.
if (process.env.DEMO_MODE !== "false") {
  router.post("/demo", demo);
}

module.exports = router;