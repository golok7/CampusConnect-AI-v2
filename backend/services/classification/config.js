// ─── Security ───────────────────────────────────────────────────────────────

const SECURITY_NAME_SIGNALS = [
  // offensive
  "malware", "exploit", "payload", "shellcode", "injection", "bypass",
  "rootkit", "trojan", "backdoor", "ransomware", "beacon",
  "rat", "reverse-shell", "redteam", "pentest", "ctf", "edr",
  "keylogger", "dropper", "stager", "implant", "loader",
  "spoofing", "arp-spoof", "mitm", "phishing", "ddos",
  "intrusion", "honeypot", "ids", "ips", "firewall-bypass",
  // defensive / crypto
  "encryption", "aes", "rsa", "vault",
  "secure-storage", "credential",
  "key-management", "token-security",
  "password-hashing", "iam", "rbac",
  "oauth-security", "tls", "jwt-security",
];

const SECURITY_NAME_REGEXES = SECURITY_NAME_SIGNALS.map(
  s => new RegExp(`\\b${s}\\b`, "i")
);

const SECURITY_TOPICS = [
  // offensive
  "malware", "malware-analysis", "redteam", "red-team", "pentest",
  "ctf", "exploit", "reverse-engineering", "cybersecurity", "edr",
  // defensive
  "encryption", "cryptography", "iam", "rbac", "jwt", "tls",
  "vault", "appsec", "devsecops", "secure-coding",
];

const SECURITY_DESC_PHRASES = [
  // offensive
  "reverse shell", "code injection", "malware", "exploit", "beacon",
  "c2", "red team", "pentest", "edr", "payload", "shellcode",
  // defensive
  "encryption", "key management", "secure storage", "password hashing",
  "credential security", "iam", "rbac", "jwt security", "tls", "vault",
];

const SECURITY_DESC_REGEXES = SECURITY_DESC_PHRASES.map(
  p => new RegExp(`\\b${p.replace(/[\s-]/g, "[\\s\\-]")}\\b`, "i")
);

// ─── DSA ─────────────────────────────────────────────────────────────────────

const DSA_HARD_SIGNALS = [
  "leetcode", "codeforces", "hackerrank", "competitive-programming",
  "interview-prep", "cracking-the-coding-interview",
  "data-structures-and-algorithms", "coding-challenges", "cp-solutions",
  "neetcode", "striver", "blind75", "grind75",
];

const DSA_NAME_SIGNALS = [
  "dsa", "leetcode", "competitive-programming", "data-structures",
];

// ─── Course ──────────────────────────────────────────────────────────────────

// Hard: a single match is sufficient — these are unambiguous course identifiers.
const COURSE_HARD_SIGNALS = [
  "udemy", "coursera", "nptel", "mooc", "edx", "bootcamp",
];

// Soft: require 2+ matches to avoid false positives on real student projects.
const COURSE_SOFT_SIGNALS = [
  "tutorial", "course", "assignment", "homework", "notes",
];

const COURSE_SIGNALS = [...COURSE_HARD_SIGNALS, ...COURSE_SOFT_SIGNALS];

// ─── ML research noise ───────────────────────────────────────────────────────

const ML_RESEARCH_METADATA_NOISE_TERMS = [
  "matlab", "scada", "simulink", "powersystems", "power systems",
  "pinn", "control theory", "pid controller",
];

// Global flag is safe with String.replace(); reset after each call.
const ML_RESEARCH_METADATA_NOISE_REGEXES = ML_RESEARCH_METADATA_NOISE_TERMS.map(
  term => new RegExp(`\\b${term.replace(/\s+/g, "\\s+")}\\b`, "gi")
);

// ─── Backend generic terms ───────────────────────────────────────────────────

const BACKEND_GENERIC_TERMS = new Set([
  "api", "server", "backend", "node", "endpoint", "middleware",
  "service", "request", "response",
]);

// ─── Phase 1 lightweight hints ───────────────────────────────────────────────
// Used in the metadata-only pre-scan (scoreDomainsGuarded) instead of the full
// DOMAIN_RULES ontology to keep Phase 1 signal-to-noise tight.

const PHASE1_HINTS = {
  ai_ml: [
    "neural", "deep learning", "cnn", "yolo", "object detection",
    "image segmentation", "nlp", "classification", "machine learning",
  ],
  genai: [
    "llm", "rag", "embedding", "gpt", "vector store",
    "langchain", "prompt template", "retrieval augmented",
  ],
  agentic_ai: [
    "agentic", "multi-agent", "autonomous agent", "mcp",
    "agent orchestration", "langchain agent",
    "agent executor", "tool use", "workflow engine", "reasoning loop",
    "react agent", "tool router", "task decomposition", "agent memory",
    "planning agent", "multi-step reasoning", "autonomous workflow",
    "autonomous assistant", "function execution", "agent pipeline",
  ],
  frontend: [
    "react", "nextjs", "vue", "angular", "flutter", "svelte", "redux",
  ],
  backend: [
    "rest", "graphql", "fastapi", "express", "django",
    "spring boot", "microservice", "flask", "gin",
  ],
  devops: [
    "docker", "kubernetes", "k8s", "ci", "deployment",
    "terraform", "aws", "gcp", "github actions",
  ],
  database: [
    "postgres", "mongodb", "mysql", "redis", "sql",
    "database", "firebase", "supabase",
  ],
  systems: [
    "concurrency", "multithreading", "kernel", "memory management",
    "operating system", "lock free", "allocator",
  ],
  mlops: [
    "mlops", "mlflow", "model serving", "experiment tracking",
    "model deployment", "airflow",
  ],
  algorithms: [
    "dsa", "leetcode", "codeforces", "hackerrank",
    "competitive programming", "dynamic programming",
    "segment tree", "trie", "topological sort",
  ],
  cybersecurity: [
    "exploit", "malware", "ctf", "pentest", "payload",
    "red team", "encryption", "vault", "iam", "rbac",
  ],
  blockchain: [
    "smart contract", "solidity", "ethereum", "web3", "nft", "defi",
  ],
  embedded: [
    "embedded", "firmware", "arduino", "raspberry pi", "iot",
    "microcontroller", "rtos",
  ],
  data_science: [
    "data science", "eda", "statistics", "pandas",
    "matplotlib", "correlation", "hypothesis testing",
  ],
  networking: [
    "tcp", "dns", "vpn", "routing", "bgp",
    "network protocol", "packet",
  ],
  distributed_systems: [
    "distributed", "raft", "paxos", "consensus",
    "sharding", "replication", "fault tolerant",
  ],
};

module.exports = {
  SECURITY_NAME_SIGNALS,
  SECURITY_NAME_REGEXES,
  SECURITY_TOPICS,
  SECURITY_DESC_PHRASES,
  SECURITY_DESC_REGEXES,
  DSA_HARD_SIGNALS,
  DSA_NAME_SIGNALS,
  COURSE_HARD_SIGNALS,
  COURSE_SOFT_SIGNALS,
  COURSE_SIGNALS,
  ML_RESEARCH_METADATA_NOISE_TERMS,
  ML_RESEARCH_METADATA_NOISE_REGEXES,
  BACKEND_GENERIC_TERMS,
  PHASE1_HINTS,
};
