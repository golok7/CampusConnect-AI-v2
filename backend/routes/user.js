const express = require("express");
const router  = express.Router();

const auth = require("../middleware/auth");
const User = require("../models/User");

// ================= AVAILABLE INTERESTS =================
// Single source of truth — frontend should fetch this to render the tag picker.
// Matches the DOMAIN_INTEREST_MAP in githubController + extra role-based interests.
const AVAILABLE_INTERESTS = [
  // GitHub-derived domain interests
  "Generative AI",
  "Machine Learning",
  "Backend Development",
  "Frontend Development",
  "DevOps & Cloud",
  "Databases",
  "Systems Programming",
  // Role / career interests (from the tag picker UI)
  "Full Stack",
  "Android",
  "iOS",
  "Data Science",
  "Data Engineering",
  "Cybersecurity",
  "Open Source",
  "Competitive Programming",
  "Product Management",
  "UI/UX Design",
  "Embedded Systems",
  "Blockchain",
  "Game Development",
  "Research & Academia",
];

// ── GET /user/profile ──────────────────────────────────────────────────────────
router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("Profile error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// ── GET /user/interests/available ─────────────────────────────────────────────
// Returns the full list of available interest tags for the frontend tag picker.
router.get("/interests/available", auth, (req, res) => {
  res.json({ interests: AVAILABLE_INTERESTS });
});

// ── PUT /user/interests ───────────────────────────────────────────────────────
// Body: { interests: ["Generative AI", "Backend Development", ...] }
// Replaces the user's interests with the provided array.
// Validates that each interest is from the allowed list.
router.put("/interests", auth, async (req, res) => {
  try {
    const { interests } = req.body;

    if (!Array.isArray(interests)) {
      return res.status(400).json({ message: "interests must be an array" });
    }

    // Validate all provided interests are from the allowed list
    const invalid = interests.filter(i => !AVAILABLE_INTERESTS.includes(i));
    if (invalid.length > 0) {
      return res.status(400).json({
        message: `Invalid interests: ${invalid.join(", ")}`,
        allowed: AVAILABLE_INTERESTS
      });
    }

    // Deduplicate in case frontend sends duplicates
    const deduped = [...new Set(interests)];

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { interests: deduped },
      { new: true, select: "-password" }
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      message:   "Interests updated",
      interests: user.interests
    });

  } catch (err) {
    console.error("Update interests error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// ── PUT /user/update ──────────────────────────────────────────────────────────
// Allows updating non-sensitive profile fields.
// Body: any subset of { name, branch, year, interests, githubUsername }
// Protected fields (email, password, activityScore, topDomains) are silently ignored.
router.put("/update", auth, async (req, res) => {
  try {
    const GITHUB_USERNAME_REGEX = /^[a-zA-Z0-9-]{1,39}$/;

    const allowed = ["name", "branch", "year", "interests", "githubUsername"];
    const updates = {};

    for (const field of allowed) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "No updatable fields provided",
        updatable: allowed,
      });
    }

    // ── Validate individual fields ──
    if (updates.interests !== undefined) {
      if (!Array.isArray(updates.interests)) {
        return res.status(400).json({ message: "interests must be an array" });
      }
      const invalid = updates.interests.filter(i => !AVAILABLE_INTERESTS.includes(i));
      if (invalid.length > 0) {
        return res.status(400).json({
          message: `Invalid interests: ${invalid.join(", ")}`,
          allowed: AVAILABLE_INTERESTS,
        });
      }
      updates.interests = [...new Set(updates.interests)];
    }

    if (updates.year !== undefined) {
      const y = parseInt(updates.year, 10);
      if (isNaN(y) || y < 1 || y > 6) {
        return res.status(400).json({ message: "year must be between 1 and 6" });
      }
      updates.year = y;
    }

    if (updates.githubUsername !== undefined &&
        !GITHUB_USERNAME_REGEX.test(updates.githubUsername)) {
      return res.status(400).json({ message: "Invalid GitHub username format" });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, select: "-password" }
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "Profile updated", user });

  } catch (err) {
    console.error("Update profile error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;