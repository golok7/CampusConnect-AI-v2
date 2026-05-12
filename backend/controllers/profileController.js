const { getProfile } = require("../services/profileService");

const GITHUB_USERNAME_REGEX = /^[a-zA-Z0-9-]{1,39}$/;

// ── GET /users/:githubUsername/profile ────────────────────────────────────────
// Returns a fully assembled semantic profile for a given GitHub user.
// Protected — requires a valid auth token (any role can view any profile).
//
// Response shape:
//   { _id, name, githubUsername, branch, year, role, interests,
//     topDomains, profileSummary, skillEvidence, domainEvidence, contributionStats }

exports.getProfileHandler = async (req, res) => {
  try {
    const { githubUsername } = req.params;

    if (!GITHUB_USERNAME_REGEX.test(githubUsername)) {
      return res.status(400).json({ message: "Invalid GitHub username format" });
    }

    const profile = await getProfile(githubUsername);

    if (!profile) {
      return res.status(404).json({ message: `No user found with GitHub username: ${githubUsername}` });
    }

    return res.json(profile);

  } catch (err) {
    console.error("profileController error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};
