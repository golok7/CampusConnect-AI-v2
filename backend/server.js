require("dotenv").config();
const express  = require("express");
const mongoose = require("mongoose");
const cors     = require("cors");

// ── Route modules ──────────────────────────────────────────────────────────────
const authRoutes           = require("./routes/auth");
const userRoutes           = require("./routes/user");
const githubRoutes         = require("./routes/github");
const recommendationRoutes = require("./routes/recommendation");
const leaderboardRoutes    = require("./routes/leaderboard");
const searchRoutes         = require("./routes/search");
const adminRoutes          = require("./routes/admin");
const profileRoutes        = require("./routes/profile");
const ontologyRoutes       = require("./routes/ontology");
const resumeRoutes         = require("./routes/resume");
const pipelineRoutes       = require("./routes/pipeline");
const interviewRoutes      = require("./routes/interview");

// ── App init ───────────────────────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Health check ───────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ status: "CampusConnect AI API running" });
});

// ── API routes ─────────────────────────────────────────────────────────────────
app.use("/auth",        authRoutes);
app.use("/user",        userRoutes);
app.use("/github",      githubRoutes);
app.use("/recommend",   recommendationRoutes);
app.use("/leaderboard", leaderboardRoutes);
app.use("/search",      searchRoutes);
app.use("/admin",       adminRoutes);
app.use("/users",       profileRoutes);
app.use("/api/ontology", ontologyRoutes);
app.use("/resume",      resumeRoutes);
app.use("/pipeline",    pipelineRoutes);
app.use("/interview",   interviewRoutes);

// ── 404 handler ────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ── Global error handler ───────────────────────────────────────────────────────
app.use((err, req, res, next) => {  // eslint-disable-line no-unused-vars
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
  });
});

// ── Connect to DB, then start server ──────────────────────────────────────────
mongoose.set("strictQuery", true);

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("DB connected");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error("DB connection failed:", err.message);
    process.exit(1);
  });
