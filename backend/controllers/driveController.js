const MOCK_DRIVES = require("../mocks/placementDrives");
const Pipeline = require("../models/Pipeline");

exports.createDrive = async (req, res) => {
  try {
    const { title, company, type, description, requiredSkills, domainScores } = req.body;
    
    if (!title || !company || !type || !description) {
      return res.status(400).json({ message: "Title, company, type, and description are required" });
    }

    const drive = {
      _id: "mock_new_" + Date.now(),
      title,
      company,
      type,
      description,
      requiredSkills: requiredSkills || [],
      domainScores: domainScores || {},
      recruiterId: req.user.id,
      status: "active",
      createdAt: new Date()
    };
    
    MOCK_DRIVES.push(drive);

    res.status(201).json({ message: "Placement drive created successfully", drive });
  } catch (err) {
    console.error("Create drive error:", err.message);
    res.status(500).json({ message: "Failed to create placement drive" });
  }
};

exports.getDrives = async (req, res) => {
  try {
    const drives = MOCK_DRIVES.filter(d => d.recruiterId === req.user.id || d.recruiterId === "mock_recruiter");
    drives.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Aggregating candidate counts per stage for each drive
    const driveIds = drives.map(d => d._id);
    const pipelines = await Pipeline.find({ driveId: { $in: driveIds } }).lean();
    
    const countMap = {}; // driveId -> stage -> count
    for (const d of drives) {
      countMap[d._id.toString()] = { shortlisted: 0, interviewing: 0, offered: 0, rejected: 0 };
    }
    
    for (const p of pipelines) {
      if (p.driveId && countMap[p.driveId.toString()]) {
        countMap[p.driveId.toString()][p.stage]++;
      }
    }
    
    const result = drives.map(d => ({
      ...d,
      candidateCounts: countMap[d._id.toString()]
    }));
    
    res.json(result);
  } catch (err) {
    console.error("Get drives error:", err.message);
    res.status(500).json({ message: "Failed to fetch placement drives" });
  }
};
