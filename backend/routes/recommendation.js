const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const { recommendUsers } = require("../controllers/recommendationController");

router.get("/users", auth, recommendUsers);

module.exports = router;