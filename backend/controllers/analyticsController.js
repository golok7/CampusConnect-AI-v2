const User          = require("../models/User");
const Pipeline      = require("../models/Pipeline");
const Drive         = require("../models/Drive");
const MockInterview = require("../models/MockInterview");

// ── GET /analytics/global ──────────────────────────────────────────────────
exports.getGlobalAnalytics = async (req, res) => {
  try {
    // Pipeline stats (placed students)
    const placedCount = await Pipeline.countDocuments({ stage: "offered" });
    
    // Aggregation for top skills and domains
    const students = await User.find({ role: "student" }).lean();
    
    let totalActivityScore = 0;
    const skillCounts = {};
    const domainCounts = {};
    
    students.forEach(student => {
      totalActivityScore += (student.activityScore || 0);
      
      (student.normalizedSkills || []).forEach(skill => {
        skillCounts[skill] = (skillCounts[skill] || 0) + 1;
      });
      
      (student.topDomains || []).forEach(d => {
        domainCounts[d.domain] = (domainCounts[d.domain] || 0) + 1;
      });
    });
    
    const avgActivityScore = students.length > 0 ? totalActivityScore / students.length : 0;
    
    const topSkills = Object.entries(skillCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
      
    const topDomains = Object.entries(domainCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([domain, count]) => ({ domain, count }));

    return res.json({
      totalStudents: students.length,
      placedCount,
      avgActivityScore,
      topSkills,
      topDomains
    });
  } catch (err) {
    console.error("Global analytics error:", err.message);
    return res.status(500).json({ message: "Failed to fetch global analytics" });
  }
};

// ── GET /analytics/recruiter ──────────────────────────────────────────────────
exports.getRecruiterAnalytics = async (req, res) => {
  try {
    if (req.user.role !== "recruiter") {
      return res.status(403).json({ message: "Access denied" });
    }

    const drives   = await Drive.find({ recruiterId: req.user.id }).lean();
    const driveIds = drives.map(d => d._id);
    
    // Aggregate pipeline stages for these drives
    const pipelineEntries = await Pipeline.find({ driveId: { $in: driveIds } }).lean();
    
    const funnel = {
      applied: 0,
      shortlisted: 0,
      interviewing: 0,
      offered: 0,
      rejected: 0
    };
    
    pipelineEntries.forEach(p => {
      if (funnel[p.stage] !== undefined) funnel[p.stage]++;
    });
    
    return res.json({
      totalDrives: drives.length,
      totalCandidates: pipelineEntries.length,
      funnel
    });
  } catch (err) {
    console.error("Recruiter analytics error:", err.message);
    return res.status(500).json({ message: "Failed to fetch recruiter analytics" });
  }
};

// ── GET /analytics/student/:id ──────────────────────────────────────────────────
exports.getStudentAnalytics = async (req, res) => {
  try {
    const studentId = req.params.id;
    const student = await User.findById(studentId).select("name email activityScore topDomains normalizedSkills githubData mockInterviewStats role").lean();
    
    if (!student || student.role === "recruiter") {
      return res.status(404).json({ message: "Student not found" });
    }
    
    // Mock Interviews
    const interviews = await MockInterview.find({ userId: studentId }).sort({ createdAt: -1 }).limit(5).lean();
    
    return res.json({
      profile: {
        name: student.name,
        email: student.email,
        activityScore: student.activityScore,
        teamworkScore: student.githubData?.teamworkScore || 0,
        topDomains: student.topDomains,
        skills: student.normalizedSkills
      },
      mockInterviewStats: student.mockInterviewStats || { totalInterviews: 0, avgOverallScore: 0, avgDsaScore: 0, avgCommunicationScore: 0 },
      recentInterviews: interviews.map(i => ({
        id: i._id,
        jobTitle: i.jobTitle,
        overallScore: i.overallScore,
        date: i.createdAt
      }))
    });
  } catch (err) {
    console.error("Student analytics error:", err.message);
    return res.status(500).json({ message: "Failed to fetch student analytics" });
  }
};
