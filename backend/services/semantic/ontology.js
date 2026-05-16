// ================= DOMAIN RULES =================
const DOMAIN_RULES = {
  ai_ml: [
    "neural", "classification", "detection", "vision", "nlp",
    "machine learning", "deep learning", "cnn", "rnn",
    "resnet", "yolo", "fine-tuning", "finetuning", "fine tune", "fine-tuned", "fine tuned",
    "training dataset", "ml dataset", "training data", "model training", "huggingface",
    "computer vision", "image segmentation", "object detection",
    "natural language processing", "speech recognition",
    "siamese network", "encoder decoder",
    // NLP / Transformer-specific
    "transformer", "bert", "roberta", "embedding", "embeddings", "sentence embedding",
    "semantic embedding", "text classification", "sentiment analysis",
    "named entity recognition", "ner", "question answering",
    "summarization", "text summarization", "abstractive summarization",
    "token classification", "sequence labeling", "semantic similarity",
    "language model", "language modeling", "multilingual model",
    "intent classification", "intent detection", "entity extraction",
    // General ML signals
    "accuracy", "validation accuracy", "training accuracy", "map score",
    "time series", "forecasting", "anomaly detection",
    // Applied ML — prediction, serving, recommendation, recognition
    "prediction", "ml prediction", "model prediction", "prediction api",
    "recommendation system", "recommendation engine", "collaborative filtering",
    "inference api", "ml inference api", "model serving api",
    "classification system", "classification model",
    "detection system", "disease detection",
    "ranking model", "personalization", "content ranking",
    "image recognition", "recognition model",
    "regression", "linear regression", "logistic regression",
    "feature engineering", "feature extraction", "feature selection",
    "analytics pipeline", "ml pipeline",
    "crop disease", "agricultural ai", "plant disease detection",
    "ai powered", "ai-powered", "ai assisted",
  ],
  genai: [
    // LLM models and APIs
    "gpt", "llm", "openai api", "anthropic", "gemini",
    // Application patterns (what students actually build)
    "chatbot", "chat completion", "conversational ai", "ai assistant",
    "prompt engineering", "prompt template", "system prompt",
    "tool calling", "function calling", "document qa",
    // Retrieval / RAG
    "rag", "vector store", "retrieval augmented", "semantic search",
    // Frameworks
    "langchain", "llamaindex",
    // LLM-specific techniques
    "lora", "qlora", "context window",
    "chain of thought", "few shot", "zero shot", "reasoning model", "token budget",
    // Inference / models
    "llama", "mistral", "vllm", "kv cache", "speculative decoding",
    "llm inference", "transformer inference",
  ],
  agentic_ai: [
    "agentic", "multi-agent", "autonomous agent", "autonomous llm",
    "mcp", "model context protocol", "langchain agent", "adk",
    "agent development kit", "agent orchestration", "llm orchestration",
    "agent loop", "plan and execute", "rag agent", "agentic ai",
    "agent planning", "agent reflection", "goal directed agent",
    "self improving agent", "agentic workflow llm",
    // Modern agentic ecosystem
    "copilot", "ai copilot", "copilot system",
    "context grounding", "context orchestration",
    "execution runtime", "agent runtime", "ai runtime",
    "ai workflow", "autonomous workflow",
    "memory orchestration", "memory management agent",
    "task graph", "workflow graph",
    "reasoning engine",
    "retrieval orchestration",
    "mcp server", "mcp ecosystem",
    // Practical / student-facing agentic patterns
    "agent executor", "tool use", "tool calling agent", "tool router",
    "workflow engine", "reasoning loop", "react agent",
    "function execution", "multi-step workflow", "task decomposition",
    "memory retrieval", "agent memory", "planning agent",
    "planner", "executor agent", "autonomous assistant",
    "tool-augmented", "tool augmented llm",
    "step-by-step reasoning", "multi-step reasoning",
    "action planning", "observation loop",
    "agent pipeline", "agent chain",
    // Extended agentic ecosystem — voice, UI, triage, real-time agents
    "tambo", "parlant", "pipecat", "livekit agents",
    "voice agent", "voice ai", "speech agent",
    "support agent", "triage agent", "support triage",
    "a2a", "agent to agent", "agent-to-agent",
    "ai agents", "agent sdk", "agent framework",
    "generative ui agent", "agentic ui",
    "chromadb rag", "agent with rag",
    // Agent runtime / orchestration architecture
    "agent runtime", "workflow runtime", "execution graph",
    "multi-agent systems", "multi-model orchestration",
    "tool orchestration", "context engineering",
    "self-learning agent", "autonomous learning",
    "planner executor", "model routing",
    "coordination framework", "agent infrastructure",
    "agent factory", "ai software factory",
    "distributed multi-agent", "autonomous crew",
    "agent swarm", "swarm intelligence",
  ],
  frontend: [
    "react", "nextjs", "vue", "angular",
    "figma",
    "react native", "flutter", "svelte",
    "redux", "vite", "webpack", "sass", "scss",
    "dom", "jsx", "tsx", "browser api", "web component",
    // Applied frontend
    "responsive ui", "responsive design", "user interface",
    "browser extension", "component system", "component library",
    "animation", "transition", "interaction",
    "user experience", "ux", "dashboard",
    "client-side", "realtime ui", "state management",
    "visualization", "chart", "data visualization",
    // Behavioral UI semantics
    "interaction design", "micro-interaction",
    "collaborative ui", "real-time feedback",
    "drag drop", "drag and drop", "dnd",
    "canvas", "canvas interaction",
    "rich text editor", "code editor", "editor",
    "accessibility", "a11y", "aria",
  ],
  backend: [
    "backend", "rest", "graphql", "fastapi",
    "express", "django", "flask",
    "spring boot", "springboot", "spring security", "spring data",
    "gin", "actix", "axum",
    "jpa", "hibernate", "servlet", "restcontroller",
    "microservice", "webhook", "middleware", "endpoint",
    "service layer", "repository pattern",
    "websocket", "pubsub", "event bus", "notification service",
    "background worker", "retry queue", "async workflow",
    "orchestration", "synchronization", "request coordination",
    "session lifecycle",
    // System-design resilience patterns
    "rate limiting", "rate limiter", "throttling",
    "circuit breaker",
    "retry strategy", "retry logic", "exponential backoff",
    "idempotency", "idempotent",
    "distributed cache", "cache invalidation", "cache layer",
    "request batching", "batch processing",
    "api composition", "api aggregation", "api gateway pattern",
    "service discovery", "service registry",
  ],
  devops: [
    "docker", "kubernetes", "k8s", "aws", "gcp",
    "terraform", "helm", "ansible", "jenkins", "github actions", "gitlab ci",
    "serverless", "cloudflare", "vercel", "netlify", "nginx",
    "azure", "heroku",
    // Specific DevOps / SRE / IaC patterns
    "ci/cd pipeline", "cd pipeline", "release pipeline", "build pipeline",
    "infrastructure as code", "gitops", "iac",
    "sre", "site reliability",
    "observability", "infrastructure monitoring",
    "container orchestration",
    "canary deployment", "blue-green deployment", "rolling deployment",
    "on-call", "incident management", "runbook",
    "secrets management", "vault", "environment config",
    // Shell / Linux infra signals (supporting, not dominant)
    "bash", "shell script", "shell scripting", "linux", "unix",
    "bash automation", "bash scripting", "server provisioning",
    "system administration", "sysadmin",
    // Multi-service / distributed deployment topology
    "docker compose", "docker-compose", "multi-container", "multi-service deployment",
    "service topology", "container cluster", "replica", "replicas",
    "load balancer", "load balancing", "reverse proxy", "proxy server",
    "ingress", "ingress controller", "service mesh", "envoy proxy",
    // Production readiness signals
    "health check", "readiness probe", "liveness probe", "graceful shutdown",
    "resource limits", "autoscaling", "horizontal pod autoscaler", "hpa",
    "persistent volume", "pvc", "storage class",
    // Cloud-native / 12-factor
    "cloud native", "12-factor", "twelve-factor", "immutable infrastructure",
    "stateless service", "externalized config", "environment variable management",
    // Distributed infra patterns (cross-domain signal for DevOps)
    "distributed deployment", "distributed infrastructure", "cluster management",
    "node affinity", "pod scheduling", "rolling update", "zero downtime",
    "self-healing", "auto-recovery", "failover",
  ],
  database: [
    "mongo", "mysql", "postgres", "redis", "firebase", "supabase",
    "cassandra", "elasticsearch", "sqlite", "dynamodb", "clickhouse",
    "orm", "database schema", "database design", "database management",
    "sql query", "database query", "query optimization",
    "data migration", "schema migration", "db migration",
    "relational database", "nosql database", "document store",
    "indexing strategy", "sharding", "replication",
    "crud", "crud operations", "data modeling",
  ],
  systems: [
    // Classic OS / low-level
    "concurrency", "multithreading", "memory management", "operating system",
    "linux kernel", "file system", "process scheduling", "ipc", "shared memory",
    "deadlock", "mutex", "allocator", "fork", "signals", "atomic", "lock free",
    "kernel module", "syscall", "mmap", "page fault", "virtual memory",
    "spinlock", "futex", "epoll", "ptrace",
    "heap allocator", "garbage collector runtime",
    // Modern systems engineering — Linux, Go, C++, performance
    "golang", "goroutine", "channel", "go runtime", "go scheduler",
    "systems engineering", "systems programmer", "systems programming",
    "linux engineering", "linux fundamentals", "linux systems",
    "c/c++", "performance engineering", "high performance systems",
    "low latency", "zero copy", "zero-copy", "memory safe",
    "async io", "io_uring", "io multiplexing", "event loop",
    "thread pool", "work stealing", "coroutine", "cooperative scheduling",
    "posix", "system calls", "process management", "process lifecycle",
    "runtime engineering", "runtime scheduler",
    "distributed runtime", "distributed systems engineering",
    "platform engineering systems", "infrastructure engineering",
    "network programming", "high throughput", "throughput optimization",
  ],
  mlops: [
    "mlops", "mlflow", "kubeflow", "model serving",
    "model deployment", "inference", "ml pipeline", "ml data pipeline",
    "feature store", "experiment tracking", "bentoml", "triton",
    "model monitoring", "continuous training", "model registry",
    "model versioning", "data drift", "prediction drift",
  ],
  data_engineering: [
    // Core ETL / pipeline
    "etl", "extract transform load",
    "data pipeline", "data engineering", "data engineer",
    "analytics engineering", "data analytics pipeline",
    "data orchestration", "pipeline orchestration",
    "batch processing", "batch pipeline", "data ingestion",
    // Processing engines
    "spark", "apache spark", "pyspark", "hadoop", "hive", "flink", "apache flink",
    // Workflow orchestration
    "airflow", "prefect", "dagster", "luigi",
    // Data warehouses
    "data warehouse", "redshift", "bigquery", "snowflake", "databricks",
    "data mart", "olap", "dimensional modeling", "star schema", "fact table",
    // Data lakes / lakehouses
    "data lake", "delta lake", "lakehouse", "apache iceberg", "apache hudi",
    // Transformation
    "dbt", "data build tool", "sql transformation", "data transformation",
    // Data quality / governance
    "data quality", "data lineage", "data catalog", "data governance",
    "data mesh", "data contract",
    // Cloud data platforms
    "cloud data platform", "data platform", "analytics platform",
    "aws glue", "azure data factory", "google dataflow",
    // Streaming data
    "kafka streams", "data streaming", "kinesis", "event streaming pipeline",
    // Storage formats
    "parquet", "avro", "orc",
    // SQL analytics
    "sql analytics", "analytical sql", "window functions",
    "business intelligence", "bi dashboard",
  ],
  algorithms: [
    "dsa", "leetcode", "codeforces",
    "binary tree", "avl tree", "segment tree", "trie", "heap",
    "directed graph", "adjacency list", "topological sort",
    "dynamic programming", "binary search",
    "hackerrank",
    "competitive programming", "greedy", "backtracking",
    "two pointers", "sliding window",
    "atcoder", "advent of code", "aoc", "icpc", "olympiad",
    "cp solutions",
  ],
  cybersecurity: [
    "malware", "reverse engineering", "reversing", "exploit", "exploitation",
    "payload", "shellcode", "injection", "evasion", "bypass", "rootkit",
    "ransomware", "trojan", "backdoor", "c2", "command and control",
    "red team", "redteam", "pentest", "penetration testing", "ctf",
    "capture the flag", "vulnerability", "zero day", "privilege escalation",
    "lateral movement", "persistence mechanism", "registry persistence",
    "obfuscation", "antivirus",
    "edr", "endpoint detection", "windows internals",
    "disassembler", "ghidra", "ida pro", "radare",
    "steganography", "cryptography challenge", "forensics",
    "osint", "threat intelligence", "blue team", "incident response",
    "radare2", "x86", "x64", "binary analysis", "disassembly",
    "assembly", "static analysis", "dynamic analysis", "binary exploitation",
    "beacon", "implant", "c2 beacon", "command and control beacon",
    "com hijacking", "task scheduler",
    "arp spoofing", "arp poisoning", "man in the middle",
    "network attack", "packet sniffing", "intrusion detection",
    "ids", "ips", "honeypot",
    "encryption", "aes", "rsa", "tls", "ssl", "hmac", "sha",
    "vault", "secret management", "secure storage", "key management",
    "credential", "password hashing", "token security", "api key security",
    "access control", "rbac", "iam", "authentication security",
    "zero trust", "principle of least privilege", "secure coding",
  ],
  blockchain: [
    "smart contract", "solidity", "ethereum", "web3",
    "defi", "nft",
    "dapp",
    "polygon", "chainlink", "hardhat", "truffle",
    "metamask", "evm", "ganache", "solana",
    "zero knowledge", "zkp", "zk-snark", "layer 2", "dao",
  ],
  embedded: [
    "embedded", "firmware", "rtos", "microcontroller", "arduino",
    "raspberry pi", "esp32", "stm32", "fpga", "vhdl", "verilog",
    "vlsi", "rtl", "synthesis", "iot", "internet of things",
    "sensor", "actuator", "uart", "spi", "i2c", "gpio",
    "bare metal", "interrupt", "bootloader",
    "mqtt", "zigbee", "lora", "bluetooth low energy", "rf", "pwm",
    "pcb", "schematic", "kicad",
    "real-time embedded", "real time operating",
  ],
  data_science: [
    "data science", "exploratory data analysis",
    "statistics", "data cleaning", "eda",
    "pandas", "numpy", "matplotlib", "seaborn",
    "hypothesis testing", "correlation analysis", "statistical significance",
    "feature distribution", "regression analysis", "scipy",
  ],
  networking: [
    "network protocol", "tcp ip", "dns", "dhcp",
    "vpn", "routing", "bgp", "nat",
    "icmp", "ethernet", "udp",
    "tcp handshake",
    "flow control", "congestion control",
    "arp", "ospf", "link state advertisement",
    "wire protocol", "network stack",
    "packet forwarding", "routing table", "autonomous system",
  ],
  distributed_systems: [
    "raft", "paxos", "consensus algorithm",
    "leader election", "quorum", "replication",
    "distributed storage", "consistent hashing", "sharding",
    "etcd", "zookeeper",
    "gossip protocol",
    "fault tolerant", "partition tolerance", "cap theorem",
    "eventual consistency",
    "mapreduce", "distributed hash table", "distributed file system",
    "linearizability", "distributed transaction",
    // Practical distributed infra — file systems, storage engines, cluster coordination
    "chunkserver", "chunk server", "chunk replication",
    "master node", "worker node", "cluster coordinator",
    "heartbeat", "node failure", "failure recovery",
    "gfs", "hdfs", "distributed log",
    "replicated state machine", "distributed key value",
    // Modern distributed coordination — event-driven / async systems
    "event driven architecture", "event-driven architecture",
    "message queue", "distributed queue",
    "pubsub architecture", "pub sub",
    "realtime synchronization", "distributed workflow",
    "task orchestration", "stream processing",
    "event streaming", "asynchronous coordination",
    "distributed messaging", "worker coordination",
  ],
};

// ================= OVERLAP DAMPENING =================
// Suppresses the lower-scoring member of leaky domain pairs after Voyage computes the prior.
// Applied only when primary > neighbor — never reduces the dominant domain.
const OVERLAP_DAMPENING = {
  systems:             { networking: 0.82, embedded: 0.85, distributed_systems: 0.85 },
  networking:          { systems: 0.88, cybersecurity: 0.85 },
  embedded:            { systems: 0.88 },
  ai_ml:               { data_science: 0.88, mlops: 0.78, genai: 0.72, backend: 0.92, devops: 0.82, data_engineering: 0.80 },
  data_science:        { ai_ml: 0.83, data_engineering: 0.85 },
  genai:               { ai_ml: 0.82, backend: 0.90 },
  agentic_ai:          { genai: 0.85, backend: 0.90 },
  frontend:            { backend: 0.93, systems: 0.85 },
  backend:             { frontend: 0.88, distributed_systems: 0.86, cybersecurity: 0.84, ai_ml: 0.88 },
  devops:              { ai_ml: 0.86, distributed_systems: 0.80, data_engineering: 0.82 },
  distributed_systems: { backend: 0.90, systems: 0.83, devops: 0.83, data_engineering: 0.82 },
  cybersecurity:       { networking: 0.82, backend: 0.88 },
  algorithms:          { systems: 0.90, backend: 0.92, ai_ml: 0.92, frontend: 0.90 },
  data_engineering:    { mlops: 0.78, data_science: 0.82, distributed_systems: 0.82, devops: 0.85 },
  mlops:               { data_engineering: 0.80 },
};

// ================= DEP MAP =================
const DEP_MAP = {
  // Frontend
  react:              "frontend",
  next:               "frontend",
  vue:                "frontend",
  angular:            "frontend",
  tailwindcss:        "frontend",
  svelte:             "frontend",
  expo:               "frontend",
  "react-native":     "frontend",
  // Backend
  express:            "backend",
  fastapi:            "backend",
  flask:              "backend",
  django:             "backend",
  "actix-web":        "backend",
  axum:               "backend",
  warp:               "backend",
  rocket:             "backend",
  "spring-boot":      "backend",
  "spring-web":       "backend",
  "spring-data":      "backend",
  "spring-security":  "backend",
  "spring-data-jpa":  "backend",
  gin:                "backend",
  // Classical ML
  pytorch:            "ai_ml",
  tensorflow:         "ai_ml",
  "scikit-learn":     "ai_ml",
  opencv:             "ai_ml",
  streamlit:          "ai_ml",
  gradio:             "ai_ml",
  transformers:       "ai_ml",
  keras:              "ai_ml",
  xgboost:            "ai_ml",
  lightgbm:           "ai_ml",
  // GenAI
  langchain:          "genai",
  openai:             "genai",
  "qdrant-client":    "genai",
  litellm:            "genai",
  anthropic:          "genai",
  groq:               "genai",
  cohere:             "genai",
  mistralai:          "genai",
  // Agentic AI
  crewai:             "agentic_ai",
  langgraph:          "agentic_ai",
  autogen:            "agentic_ai",
  "google-adk":       "agentic_ai",
  "google-genai":     "agentic_ai",
  "pydantic-ai":      "agentic_ai",
  controlflow:        "agentic_ai",
  agno:               "agentic_ai",
  smolagents:         "agentic_ai",
  "haystack-ai":      "agentic_ai",
  tambo:              "agentic_ai",
  "@tambo-ai":        "agentic_ai",
  parlant:            "agentic_ai",
  pipecat:            "agentic_ai",
  "pipecat-ai":       "agentic_ai",
  "livekit-agents":   "agentic_ai",
  "livekit-server-sdk": "agentic_ai",
  firecrawl:          "agentic_ai",
  "@mendable/firecrawl-js": "agentic_ai",
  "firecrawl-py":     "agentic_ai",
  e2b:                "agentic_ai",
  "e2b-code-interpreter": "agentic_ai",
  deepgram:           "agentic_ai",
  "deepgram-sdk":     "agentic_ai",
  // Vector databases
  chromadb:           "database",
  faiss:              "database",
  "faiss-cpu":        "database",
  // DevOps
  docker:             "devops",
  // Database
  mongoose:           "database",
  prisma:             "database",
  redis:              "database",
  supabase:           "database",
  pg:                 "database",
  psycopg2:           "database",
  pymongo:            "database",
  sqlalchemy:         "database",
  typeorm:            "database",
  sequelize:          "database",
  postgresql:         "database",
  hibernate:          "database",
  flyway:             "database",
  sqlx:               "database",
  diesel:             "database",
  "sea-orm":          "database",
  // Data Engineering
  pyspark:            "data_engineering",
  "apache-airflow":   "data_engineering",
  airflow:            "data_engineering",
  "dbt-core":         "data_engineering",
  prefect:            "data_engineering",
  dagster:            "data_engineering",
  luigi:              "data_engineering",
  // MLOps
  mlflow:             "mlops",
  bentoml:            "mlops",
  dvc:                "mlops",
  evidently:          "mlops",
  ray:                "mlops",
  // Cybersecurity
  pwntools:           "cybersecurity",
  capstone:           "cybersecurity",
  "keystone-engine":  "cybersecurity",
  "unicorn-engine":   "cybersecurity",
  impacket:           "cybersecurity",
  volatility3:        "cybersecurity",
  scapy:              "cybersecurity",
  angr:               "cybersecurity",
  r2pipe:             "cybersecurity",
  cryptography:       "cybersecurity",
  // Blockchain / Web3
  ethers:             "blockchain",
  web3:               "blockchain",
  hardhat:            "blockchain",
  truffle:            "blockchain",
  "anchor-lang":      "blockchain",
  "near-sdk":         "blockchain",
  // Embedded / IoT
  micropython:        "embedded",
  "paho-mqtt":        "embedded",
  freertos:           "embedded",
  // Data Science (dep-only — intentional signal)
  matplotlib:         "data_science",
  seaborn:            "data_science",
  plotly:             "data_science",
  pandas:             "data_science",
  numpy:              "data_science",
  scipy:              "data_science",
  statsmodels:        "data_science",
  // Rust systems
  tokio:              "systems",
  hyper:              "systems",
  tonic:              "systems",
  // Distributed Systems
  kazoo:              "distributed_systems",
  etcd3:              "distributed_systems",
  "python-etcd":      "distributed_systems",
  "aiokafka":         "distributed_systems",
  "confluent-kafka":  "distributed_systems",
};

// Each domain is represented by short focused exemplar phrases (prototypes).
// Short, specific phrases produce narrower, better-separated embedding manifolds.
// Similarity = max(cos_sim(repo, proto)) averaged over top-2 prototypes per domain.
const DOMAIN_PROTOTYPES = {
  ai_ml: [
    "supervised classification scikit-learn model training",
    "neural network backpropagation PyTorch training loop",
    "CNN image classification object detection YOLO",
    "XGBoost LightGBM gradient boosting hyperparameter tuning",
    "LSTM seq2seq encoder decoder sequence model",
    "NLP transformer fine-tuning custom labeled dataset",
    // Applied ML systems
    "machine learning prediction classification detection recommendation system",
    "AI-powered analytics forecasting inference platform",
    "computer vision detection recognition classification pipeline",
    "ML inference API FastAPI prediction serving endpoint",
    "recommendation engine ranking personalization machine learning",
    "crop disease detection image classification agricultural AI",
    "tabular ML prediction regression classification analytics",
  ],

  genai: [
    "LLM inference token generation context window quantization",
    "RAG retrieval augmented generation vector store embedding pipeline",
    "LoRA QLORA GGUF fine-tune adapter weight merge quantized",
    "vLLM KV cache speculative decode throughput tokens per second",
    "chain of thought prompt reasoning token budget system prompt",
    "LLM chatbot conversational assistant retrieval memory prompt",
    "PDF question answering RAG semantic search vector database",
    "AI copilot prompt engineering retrieval workflow",
    "LangChain retrieval QA document assistant embedding search",
    "LLM application streaming chat completion tool calling",
  ],

  agentic_ai: [
    "autonomous LLM agent planning reflection execution tool-calling",
    "multi-agent coordination reasoning memory retrieval LangGraph",
    "CrewAI role delegation autonomous crew task goal",
    "agent loop observe reflect decide act memory persistence",
    "self-improving autonomous agent goal-directed planning reasoning",
    // Modern agentic ecosystem
    "AI copilot context grounding memory orchestration execution runtime",
    "autonomous workflow graph task planning reasoning engine agent",
    "MCP server context orchestration agent runtime tool execution",
    "retrieval orchestration memory agent task graph workflow engine",
    // Practical student-style prototypes
    "LangChain agent executor tool memory workflow autonomous assistant",
    "AI agent tool use autonomous assistant function calling multi-step",
    "multi-step reasoning workflow orchestration planning execution agent",
    "retrieval agent memory planning execution tool-augmented LLM",
    "tool calling autonomous workflow memory agent pipeline",
    "agent executor LangGraph CrewAI orchestration task decomposition",
    "AI workflow automation reasoning memory tools action loop",
    "planning agent task decomposition step-by-step reasoning execution",
    "autonomous LLM tool router function execution memory retrieval",
    "agentic assistant observe plan act reflect memory persistence tools",
    // ADK / Google Agent Development Kit
    "Google ADK agent development kit multi-agent orchestration Gemini tool",
    "ADK agent template production-ready multi-agent system Google Gemini",
    // MCP ecosystem
    "MCP model context protocol server tool execution agent runtime context",
    "model context protocol MCP agent orchestration context grounding tools",
    // Self-learning / autonomous infra
    "self-learning agent autonomous learning context grounding pipeline MCP",
    "distributed multi-agent architecture coordination autonomous workflow factory",
  ],

  frontend: [
    "React hydration reconciliation virtual DOM state management",
    "Next.js SPA page route hydration client component JSX",
    "Redux Zustand state management store selector dispatch React",
    "React Native Flutter mobile UI screen navigation tab bar",
    "Vue reactive state composition API client routing hydration",
    // Applied frontend — interactive and visual
    "responsive interactive user interface dashboard frontend",
    "browser extension realtime UI interaction frontend",
    "frontend animation component state management UX",
    "interactive visualization chart dashboard frontend",
    "client-side application responsive design user experience",
    "React Next.js frontend component architecture",
    "frontend event handling form interaction UI workflow",
    // Behavioral UI semantics
    "interaction design drag-drop canvas editor collaborative UI frontend",
    "accessibility a11y ARIA real-time feedback micro-interaction UI",
  ],

  backend: [
    "REST endpoint controller service repository CRUD persistence",
    "Express.js JWT auth middleware route handler session management",
    "Prisma ORM schema migration transaction REST controller CRUD",
    "request handler serializer validation middleware API routing",
    "Celery BullMQ job queue worker retry dead-letter",
    "microservice gRPC Spring Boot FastAPI Gin service mesh",
    "rate limit middleware error handler response serialization",
    "websocket realtime event streaming notification backend",
    "async queue worker retry dead-letter background processing",
    "backend orchestration workflow state transition event handling",
    "WebSocket server realtime broadcast room session gateway",
    "FastAPI dependency injection Pydantic validation async endpoint",
    "Spring Boot service repository bean injection REST CRUD API",
    "session lifecycle cache persistence request coordination",
    "API gateway backend proxy middleware request routing",
    // System-design resilience patterns
    "rate limiting circuit breaker retry idempotency backend resilience",
    "service discovery API composition distributed cache request batching",
  ],

  devops: [
    "Docker Kubernetes container deployment manifest",
    "GitHub Actions CI/CD pipeline automation",
    "Terraform AWS GCP Azure cloud infrastructure",
    "Helm Ansible configuration management playbook",
    "Prometheus Grafana monitoring alerting metrics",
    // Specific IaC / SRE / release engineering
    "GitOps infrastructure as code Kubernetes operator service mesh",
    "SRE incident management on-call observability SLO SLI error budget",
    "blue-green canary rolling deployment release automation rollback",
    // Linux / shell infra (supporting signal — Docker/K8s still dominate)
    "Linux server bash shell scripting system administration automation",
    "Unix shell script server provisioning infrastructure automation",
    // Multi-service distributed deployment topology
    "Docker Compose multi-service deployment container networking replica",
    "Kubernetes deployment service ingress replica load balancing production",
    "distributed infrastructure deployment cluster replica health check scaling",
    "cloud-native production deployment Docker Kubernetes autoscaling zero-downtime",
    // Production readiness and operational depth
    "health check readiness probe liveness probe graceful shutdown resource limits",
    "container orchestration replica autoscaler persistent volume cloud native",
    "reverse proxy load balancer nginx ingress service mesh production deployment",
    // Infra-heavy project patterns
    "production infrastructure Docker Compose multi-container networking proxy",
    "Docker Kubernetes deployment pipeline release automation cloud operations",
  ],

  database: [
    "PostgreSQL SQL DDL schema migration index",
    "MongoDB document model ORM Mongoose Prisma",
    "Redis caching key expiry eviction strategy",
    "query optimization EXPLAIN covering index denormalize",
    "connection pool transaction isolation foreign key constraint",
  ],

  systems: [
    // Classic low-level OS / kernel
    "lock-free concurrency futex atomic memory ordering",
    "fork exec waitpid POSIX signal zombie process management",
    "kernel module syscall ioctl scheduler preemption context switch",
    "shared memory IPC UNIX pipe semaphore virtual address space",
    // Modern systems engineering — Go, Linux, infra runtimes
    "Golang goroutine channel concurrency systems programming performance",
    "C++ systems engineering Linux performance-critical infrastructure runtime",
    "Linux engineering systems programming Golang C++ high-performance backend",
    "async I/O io_uring epoll event loop concurrent server low-latency systems",
    "systems engineering Linux fundamentals C++ Golang REST API networking",
    "high-performance concurrent server Golang Linux zero-copy network programming",
    "distributed runtime platform engineering Linux infrastructure performance",
  ],

  mlops: [
    "MLflow experiment tracking model registry artifact",
    "automated ML retraining pipeline CI/CD gate",
    "BentoML Triton model serving inference endpoint",
    "Prefect Dagster feature store ML pipeline orchestration",
    "model drift monitoring production distribution shift",
    "Docker Kubernetes bash Linux model deployment serving infrastructure",
  ],

  data_engineering: [
    "ETL pipeline Spark PySpark batch processing data ingestion transformation",
    "Airflow DAG orchestration pipeline scheduling workflow data engineering",
    "data warehouse Redshift BigQuery Snowflake dimensional modeling star schema",
    "dbt data build tool SQL transformation analytics engineering data modeling",
    "data lake Delta Lake Iceberg Lakehouse S3 Parquet batch streaming",
    "Kafka Flink streaming data platform cloud analytics ingestion pipeline",
    "data quality lineage catalog governance data mesh analytics platform ETL",
  ],

  algorithms: [
    "Fenwick tree segment tree lazy propagation range query optimization",
    "Dijkstra Bellman-Ford Floyd-Warshall shortest path graph algorithm",
    "dynamic programming memoization tabulation recurrence optimization",
    "asymptotic analysis amortized complexity NP-complete reduction proof",
    "competitive programming combinatorics number theory modular arithmetic",
    "disjoint set union trie sparse table lowest common ancestor",
  ],

  cybersecurity: [
    "exploit buffer overflow CTF pwntools shellcode binary",
    "malware reverse engineering Ghidra IDA Pro disassembly",
    "red team C2 beacon implant EDR evasion lateral movement",
    "penetration testing privilege escalation OSINT recon",
    "vulnerability CVE zero-day PoC exploit development",
    "packet spoofing ARP poisoning man in the middle attack",
    "AES RSA TLS encryption key management cryptographic vault",
    "RBAC IAM access control zero trust privilege enforcement",
    "credential protection password hashing secure token storage",
  ],

  blockchain: [
    "Solidity EVM smart contract bytecode opcode ABI deploy",
    "validator mempool block producer consensus finality stake",
    "ERC-20 ERC-721 NFT mint burn transfer Solidity contract",
    "Hardhat Foundry Truffle smart contract unit test fork",
    "ZK-SNARK zkEVM zero knowledge proof verifier circuit",
  ],

  embedded: [
    "STM32 ESP32 firmware microcontroller register",
    "FreeRTOS interrupt service routine bare metal",
    "I2C SPI UART GPIO peripheral driver",
    "FPGA VHDL Verilog RTL synthesis timing",
    "MQTT IoT sensor actuator Arduino Raspberry Pi",
  ],

  data_science: [
    "hypothesis test ANOVA t-test p-value statistical significance",
    "maximum likelihood estimation residual heteroscedasticity inference",
    "confidence interval bootstrap permutation effect size power",
    "Seaborn boxplot correlation heatmap scatter residual plot",
    "statsmodels OLS regression coefficient standard error",
    "Pandas EDA groupby pivot crosstab feature distribution cleaning",
    "statistical inference hypothesis testing p-value confidence interval",
  ],

  networking: [
    "BGP OSPF routing table path selection autonomous system protocol",
    "DNS resolver authoritative nameserver record lookup zone",
    "TCP congestion control flow control reliable packet delivery",
    "IPv4 IPv6 subnet forwarding plane DHCP NAT VPN",
    "packet capture tcpdump wireshark ethernet frame analysis",
  ],

  distributed_systems: [
    "distributed consensus Raft Paxos replication quorum",
    "distributed storage sharding consistent hashing fault tolerance",
    "leader election etcd ZooKeeper distributed coordination lock",
    "eventual consistency CAP theorem partition tolerance",
    "gossip protocol cluster membership distributed hash table",
    "distributed WAL replication quorum commit consensus storage",
    // Modern distributed coordination semantics
    "event-driven distributed workflow realtime coordination",
    "distributed queue worker orchestration async messaging",
    "stream processing realtime synchronization distributed services",
    "distributed task coordination websocket event pipeline",
    // Practical distributed infrastructure — GFS, Chord, HDFS style projects
    "distributed file system chunk replication heartbeat leader election",
    "master chunkserver distributed storage coordination failure recovery",
    "Google file system distributed storage chunk routing replication metadata",
    "distributed filesystem node replication streaming cluster coordination",
  ],
};

// MLOps hard gate: require concrete evidence — tooling OR infra/serving semantics.
// Broadened from package-only because modern student repos deploy models via Docker,
// Kubernetes, and prediction APIs without using enterprise MLOps packages.
const MLOPS_REQUIRED_EVIDENCE = [
  // Classic MLOps tooling
  "mlflow", "kubeflow", "airflow", "prefect", "bentoml", "triton",
  "evidently", "ray", "dvc", "wandb", "feast", "tecton", "seldon",
  "metaflow", "kedro", "zenml", "neptune", "comet-ml", "clearml",
  // Serving / deployment semantics
  "model serving", "model deployment", "inference api", "prediction api",
  "serving endpoint", "deployment pipeline",
  // Infra primitives
  "docker", "kubernetes", "k8s", "helm", "container",
  // Production ML semantics
  "real-time inference", "batch inference", "gpu inference",
  "model monitoring", "experiment tracking", "feature store",
];

// Bump whenever DOMAIN_PROTOTYPES change — forces a re-embed on next startup.
const DOMAIN_DESC_VERSION = "v34";

// ── Depth Signal Weights ──────────────────────────────────────────────────────
// Tokens detected in deps + readme + topics that signal engineering sophistication.
// Score = sum of matched weights, capped at 1.0 via normalization in githubService.
// These are REPO-LEVEL signals — not domain classification, but project maturity.
//
// Tiers:
//   3 — architecture-defining (Kafka, Kubernetes, gRPC, Terraform)
//   2 — infra maturity (Docker, Redis, CI/CD, vector DB, testing frameworks)
//   1 — supporting signal (worker, queue, health check, async)
const DEPTH_SIGNAL_WEIGHTS = {
  // Container / orchestration (architecture-defining)
  kubernetes:          3,
  "k8s":               3,
  terraform:           3,
  helm:                3,
  kafka:               3,
  grpc:                3,
  "grpcio":            3,
  rabbitmq:            3,
  // Infra maturity
  docker:              2,
  "docker-compose":    2,
  redis:               2,
  "github actions":    2,
  "gitlab ci":         2,
  jenkins:             2,
  prometheus:          2,
  grafana:             2,
  nginx:               2,
  // Vector DB / AI infra
  pinecone:            2,
  weaviate:            2,
  qdrant:              2,
  "qdrant-client":     2,
  chromadb:            2,
  faiss:               2,
  "faiss-cpu":         2,
  // Testing maturity
  pytest:              2,
  jest:                2,
  vitest:              2,
  playwright:          2,
  cypress:             2,
  // Concurrency / async patterns
  celery:              2,
  bullmq:              2,
  bull:                2,
  rq:                  2,
  // Supporting signals
  "health check":      1,
  "readiness probe":   1,
  "liveness probe":    1,
  "graceful shutdown": 1,
  worker:              1,
  queue:               1,
  websocket:           1,
  "websockets":        1,
  "socket.io":         1,
  airflow:             2,
  prefect:             2,
  mlflow:              2,
};

// Max raw depth score before normalization — roughly 3 strong signals = 1.0
const DEPTH_SCORE_NORMALIZER = 9;

module.exports = {
  DOMAIN_RULES,
  OVERLAP_DAMPENING,
  DEP_MAP,
  DOMAIN_PROTOTYPES,
  MLOPS_REQUIRED_EVIDENCE,
  DEPTH_SIGNAL_WEIGHTS,
  DEPTH_SCORE_NORMALIZER,
  DOMAIN_DESC_VERSION,
};
