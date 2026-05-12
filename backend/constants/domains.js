// Single source of truth for domain ontology constants.
// Import from here — never duplicate these lists in individual files.

const DOMAIN_LIST = [
  "frontend", "backend", "devops", "database", "systems",
  "ai_ml", "genai", "agentic_ai", "mlops", "data_science",
  "algorithms", "cybersecurity", "blockchain", "embedded", "networking",
  "distributed_systems",
];

// Set for O(1) membership checks
const DOMAIN_SET = new Set(DOMAIN_LIST);

// Domains that share strong vocabulary and need diversity enforcement
const AI_FAMILY = new Set(["ai_ml", "genai", "agentic_ai", "mlops", "data_science"]);

// Diversity selection constants (used by githubController + seeder)
const TOP_N  = 5;
const AI_MAX = 4;

// Human-readable labels for each domain (UI + interests seeding)
const DOMAIN_INTEREST_MAP = {
  ai_ml:         "Machine Learning",
  genai:         "Generative AI",
  agentic_ai:    "Agentic AI Development",
  mlops:         "MLOps & Model Deployment",
  data_science:  "Data Science & Analytics",
  backend:       "Backend Development",
  frontend:      "Frontend Development",
  devops:        "DevOps & Cloud",
  database:      "Databases",
  systems:       "Systems Programming",
  algorithms:    "Algorithms & Data Structures",
  cybersecurity: "Cybersecurity",
  blockchain:    "Blockchain & Web3",
  embedded:      "Embedded Systems & IoT",
  networking:    "Computer Networks",
  distributed_systems: "Distributed Systems",
};

module.exports = { DOMAIN_LIST, DOMAIN_SET, AI_FAMILY, TOP_N, AI_MAX, DOMAIN_INTEREST_MAP };
