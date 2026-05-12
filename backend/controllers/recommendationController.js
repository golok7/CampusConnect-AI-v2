const User = require("../models/User");
const { getSimilarUsers, getComplementaryUsers } = require("../services/recommendationService");

exports.recommendUsers = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const allUsers = await User.find(
      { _id: { $ne: req.user.id } },
      { name: 1, topDomains: 1, branch: 1, year: 1, activityScore: 1, role: 1, githubUsername: 1 }
    );

    const similar       = getSimilarUsers(currentUser, allUsers);
    const complementary = getComplementaryUsers(currentUser, allUsers);

    res.json({ similar, complementary });

  } catch (err) {
    console.error("Recommendation error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};