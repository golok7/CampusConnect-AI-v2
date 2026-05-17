const MOCK_DRIVES = [
  {
    _id: "mock_drive_1",
    title: "Software Engineer Intern",
    company: "Google",
    type: "internship",
    description: "Looking for software engineering interns with a strong grasp of data structures and algorithms.",
    requiredSkills: ["JavaScript", "Python", "C++"],
    domainScores: { "algorithms": 0.8, "frontend": 0.2 },
    status: "active",
    recruiterId: "mock_recruiter", 
    createdAt: new Date("2026-05-10T10:00:00Z")
  },
  {
    _id: "mock_drive_2",
    title: "Backend Developer",
    company: "Amazon",
    type: "job",
    description: "Backend developer role focusing on scalable distributed systems.",
    requiredSkills: ["Java", "AWS", "Node.js"],
    domainScores: { "backend": 0.6, "distributed_systems": 0.4 },
    status: "active",
    recruiterId: "mock_recruiter",
    createdAt: new Date("2026-05-12T10:00:00Z")
  },
  {
    _id: "mock_drive_3",
    title: "AI/ML Engineer",
    company: "OpenAI",
    type: "job",
    description: "Build the next generation of LLMs.",
    requiredSkills: ["Python", "PyTorch", "Deep Learning"],
    domainScores: { "ai_ml": 0.7, "genai": 0.3 },
    status: "active",
    recruiterId: "mock_recruiter",
    createdAt: new Date("2026-05-14T10:00:00Z")
  }
];

module.exports = MOCK_DRIVES;
