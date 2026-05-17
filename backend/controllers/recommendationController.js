const User  = require("../models/User");
const Drive = require("../models/Drive");
const { getSimilarUsers, getComplementaryUsers, getJobRecommendations, getRoleMatching } = require("../services/recommendationService");

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

exports.recommendJobs = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) return res.status(404).json({ message: "User not found" });

    const activeDrives = await Drive.find({ status: "active", type: "placement" }).lean();
    const recommendations = getJobRecommendations(currentUser, activeDrives);

    res.json(recommendations);
  } catch (err) {
    console.error("Job reco error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

exports.recommendInternships = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) return res.status(404).json({ message: "User not found" });

    const activeDrives = await Drive.find({ status: "active", type: "internship" }).lean();
    const recommendations = getJobRecommendations(currentUser, activeDrives);

    res.json(recommendations);
  } catch (err) {
    console.error("Internship reco error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

exports.roleMatching = async (req, res) => {
  try {
    const { driveId } = req.params;
    const drive = await Drive.findById(driveId).lean();
    if (!drive) return res.status(404).json({ message: "Drive not found" });

    const candidates = await User.find({ role: "student" }).lean();
    const matches = getRoleMatching(drive, candidates);

    res.json(matches);
  } catch (err) {
    console.error("Role matching error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};