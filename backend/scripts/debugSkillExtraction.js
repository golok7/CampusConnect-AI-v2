/**
 * Debug script — skill extraction + matching audit for specific users.
 *
 * Usage:
 *   node backend/scripts/debugSkillExtraction.js
 *
 * Prints:
 *   • Full normalizedSkills array per user
 *   • Skills object (languages / frameworks / libraries / databases / tools)
 *   • Match/miss analysis for any query skill list
 *   • Ontology coverage check for agentic AI frameworks
 */

require("dotenv").config();
const mongoose = require("mongoose");
const User     = require("../models/User");

// ── Config ─────────────────────────────────────────────────────────────────────
const TARGET_USERNAMES = [
  "Sri-Krishna-V",
  "Keerthivasan-Venkitajalam",
];

const QUERY_SKILLS = [
  // Core agentic frameworks
  "crewai", "langgraph", "autogen", "semantic kernel", "pydantic ai",
  "agno", "openai", "anthropic", "haystack", "langchain",
  "smolagents", "dspy",
  // New agentic ecosystem
  "adk", "google adk", "mcp", "tambo", "parlant", "pipecat",
  "livekit", "deepgram", "firecrawl", "e2b",
  // AI patterns
  "rag", "multi-agent systems", "tool calling", "agent orchestration",
  "semantic search", "vector search", "context engineering", "knowledge graphs",
  // Infra
  "gemini", "chromadb", "faiss",
  // Real-time
  "webrtc", "websockets", "speech-to-text",
];

const AGENTIC_FRAMEWORK_ALIASES = [
  // langgraph
  "langgraph",
  // crewai
  "crewai", "crew ai", "crew-ai",
  // autogen
  "autogen", "pyautogen", "autogen-agentchat", "microsoft-autogen",
  // semantic kernel
  "semantic-kernel", "semantic kernel",
  // pydantic ai
  "pydantic-ai", "pydantic ai", "pydanticai",
  // agno
  "agno",
  // smolagents
  "smolagents", "smol-agents",
  // openai sdk
  "openai", "openai-python", "openai sdk",
  // anthropic
  "anthropic", "anthropic-sdk",
  // haystack
  "haystack", "haystack-ai", "deepset-haystack", "farm-haystack",
  // adk
  "adk", "google-adk", "google adk", "agent development kit",
  // mcp
  "mcp", "model-context-protocol", "model context protocol",
  // tambo
  "tambo", "tambo-ai",
  // parlant
  "parlant",
  // pipecat
  "pipecat", "pipecat-ai",
  // livekit
  "livekit", "livekit-agents",
  // deepgram
  "deepgram", "deepgram-sdk",
  // firecrawl
  "firecrawl", "firecrawl-py",
  // e2b
  "e2b", "e2b-code-interpreter",
  // gemini
  "gemini", "gemini-api",
  // AI patterns
  "rag", "retrieval-augmented-generation",
  "multi-agent-systems", "multi-agent",
  "tool-calling", "tool calling",
  "agent-orchestration", "agent orchestration",
  "semantic-search", "semantic search",
  "vector-search", "vector search",
  "context-engineering", "context engineering",
  "knowledge-graph", "knowledge graphs",
  // Vector DBs
  "chromadb", "chroma-db",
  "faiss", "faiss-cpu",
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function sep(label) {
  console.log(`\n${"═".repeat(60)}`);
  if (label) console.log(`  ${label}`);
  console.log("═".repeat(60));
}

function sub(label) {
  console.log(`\n  ── ${label}`);
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected.\n");

  for (const username of TARGET_USERNAMES) {
    sep(`USER: @${username}`);

    const user = await User.findOne({ githubUsername: username }).lean();

    if (!user) {
      console.log(`  ✗ User not found in DB.`);
      continue;
    }

    // ── 1. Stored normalizedSkills ──
    sub("normalizedSkills array (full)");
    const ns = (user.normalizedSkills || []).sort();
    console.log(`  Count: ${ns.length}`);
    console.log("  " + ns.join(", "));

    // ── 2. Skills object breakdown ──
    sub("Skills object (by category)");
    const sk = user.skills || {};
    for (const [cat, arr] of Object.entries(sk)) {
      if (arr && arr.length) console.log(`  ${cat.padEnd(12)}: ${arr.join(", ")}`);
    }

    // ── 3. Top domains ──
    sub("Top domains");
    (user.topDomains || []).forEach(d => {
      console.log(`  ${d.domain.padEnd(20)} score=${d.score?.toFixed(2)}`);
    });

    // ── 4. Query skill match / miss ──
    sub(`Query skill match analysis  (${QUERY_SKILLS.length} skills)`);
    const nsSet = new Set(ns);
    const { normalizeSkillName } = require("../services/skills/skillOntology");
    for (const qs of QUERY_SKILLS) {
      const canonical = normalizeSkillName(qs)?.toLowerCase() || qs.toLowerCase();
      const hit       = nsSet.has(canonical) || nsSet.has(qs.toLowerCase());
      const mark      = hit ? "✓ MATCH" : "✗ MISS ";
      console.log(`  ${mark}  query="${qs}"  canonical="${canonical}"  stored=${hit}`);
    }

    // ── 5. Agentic framework deep scan ──
    sub("Agentic framework alias deep scan (checking every alias variant)");
    const found = new Set();
    const missed = [];
    for (const alias of AGENTIC_FRAMEWORK_ALIASES) {
      const canonical = normalizeSkillName(alias)?.toLowerCase() || alias.toLowerCase();
      if (nsSet.has(canonical) || nsSet.has(alias.toLowerCase())) {
        found.add(`${alias} → ${canonical}`);
      } else {
        missed.push(alias);
      }
    }
    if (found.size) {
      console.log("  FOUND via aliases:");
      for (const f of found) console.log(`    ✓ ${f}`);
    } else {
      console.log("  FOUND: none");
    }
    console.log(`\n  MISSED aliases (not in normalizedSkills):`);
    console.log("  " + missed.join(", "));

    // ── 6. Activity ──
    sub("Activity");
    console.log(`  activityScore: ${user.activityScore}`);
  }

  // ── 7. Ontology coverage check ──────────────────────────────────────────────
  sep("ONTOLOGY COVERAGE CHECK");
  const { ALIAS_TO_DISPLAY } = require("../services/skills/skillOntology");
  const checkAliases = [
    // Established frameworks
    "langgraph", "crewai", "autogen", "pyautogen", "autogen-agentchat",
    "semantic-kernel", "semantic kernel", "pydantic-ai", "pydantic ai",
    "agno", "smolagents", "openai", "anthropic",
    "haystack", "haystack-ai", "dspy", "adk", "google-adk", "mcp",
    // New agentic ecosystem
    "tambo", "tambo-ai", "parlant", "pipecat", "pipecat-ai",
    "livekit", "livekit-agents", "deepgram", "deepgram-sdk",
    "firecrawl", "firecrawl-py", "e2b", "e2b-code-interpreter",
    "gemini", "gemini-api",
    // AI patterns
    "rag", "retrieval-augmented-generation",
    "multi-agent-systems", "multi-agent",
    "tool-calling", "tool calling",
    "agent-orchestration", "agent orchestration",
    "semantic-search", "semantic search",
    "vector-search", "vector search",
    "context-engineering", "context engineering",
    "knowledge-graph", "knowledge graphs",
    // Vector DBs
    "chromadb", "chroma-db", "faiss", "faiss-cpu",
    // Real-time
    "webrtc", "websocket", "websockets", "speech-to-text",
  ];
  console.log("\n  alias → canonical (via ALIAS_TO_DISPLAY):");
  for (const alias of checkAliases) {
    const canonical = ALIAS_TO_DISPLAY.get(alias.toLowerCase());
    const mark      = canonical ? "✓" : "✗ MISSING";
    console.log(`  ${mark.padEnd(10)} "${alias}" → ${canonical || "NOT IN ONTOLOGY"}`);
  }

  // ── 8. DEP_MAP coverage check ─────────────────────────────────────────────
  sep("DEP_MAP COVERAGE CHECK");
  const { DEP_MAP } = require("../services/semantic/ontology");
  const depCheck = [
    "crewai", "langgraph", "autogen", "google-adk", "pydantic-ai",
    "smolagents", "haystack-ai", "agno",
    "tambo", "parlant", "pipecat", "pipecat-ai", "livekit-agents",
    "deepgram", "firecrawl", "e2b", "e2b-code-interpreter",
    "chromadb", "faiss", "faiss-cpu",
    "langchain", "openai", "anthropic",
  ];
  console.log("\n  package → domain (via DEP_MAP):");
  for (const pkg of depCheck) {
    const domain = DEP_MAP[pkg];
    const mark   = domain ? "✓" : "✗ MISSING";
    console.log(`  ${mark.padEnd(10)} "${pkg}" → ${domain || "NOT IN DEP_MAP"}`);
  }

  await mongoose.disconnect();
  console.log("\nDone.");
}

main().catch(err => { console.error(err); process.exit(1); });
