// jobs/domainDiscovery.js
// Run this weekly (or manually) to discover new domains from accumulated unknown tags.
// Trigger: cron job, admin endpoint, or manual node execution.
//
// Usage:
//   node jobs/domainDiscovery.js
//
// Or schedule with node-cron in server.js:
//   const cron = require("node-cron");
//   cron.schedule("0 2 * * 0", () => require("./jobs/domainDiscovery").run());

require("dotenv").config();
const mongoose     = require("mongoose");
const UnknownTag   = require("../models/UnknownTag");
const PendingDomain = require("../models/PendingDomain");
const { discoverNewDomains } = require("../services/githubService");

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("[discovery] Connected to MongoDB");

    const candidates = await discoverNewDomains(UnknownTag, PendingDomain);

    if (candidates.length === 0) {
      console.log("[discovery] No new domain candidates found this run.");
    } else {
      console.log(`[discovery] ${candidates.length} candidate domains queued for admin review:`);
      candidates.forEach(d => {
        console.log(`  • ${d.key} (${d.label}) — conf: ${d.confidence} — tags: [${d.tags?.join(", ")}]`);
      });
      console.log("\n[discovery] Review at: GET /admin/pending-domains");
    }

  } catch (err) {
    console.error("[discovery] Error:", err.message);
  } finally {
    await mongoose.disconnect();
  }
}

// Run directly or export for cron
if (require.main === module) {
  run();
} else {
  module.exports = { run };
}