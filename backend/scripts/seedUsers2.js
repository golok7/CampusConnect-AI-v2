/**
 * seedUsers2.js — Seed 20 additional students (s28–s47).
 *
 * Usage (from the backend/ directory):
 *   node scripts/seedUsers2.js
 *
 * BEFORE RUNNING:
 *   1. Fill in real GitHub usernames below (replace REPLACE_ME).
 *   2. Ensure MONGO_URI and GITHUB_TOKEN are set in .env
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

if (!process.env.NODE_ENV || process.env.NODE_ENV === "production") {
  process.env.NODE_ENV = "development";
}

const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");
const User     = require("../models/User");
const { fetchGithubData }                                = require("../services/githubService");
const { AI_FAMILY, TOP_N, AI_MAX, DOMAIN_INTEREST_MAP } = require("../constants/domains");

const SEED_PASSWORD = "Test@1234";

const SEED_USERS = [
  { name: "Student 28",  email: "s28@campusconnect.test", role: "student", branch: "CSE", year: 2, githubUsername: "shivanesh1495" },
  { name: "Student 29",  email: "s29@campusconnect.test", role: "student", branch: "CSE", year: 3, githubUsername: "Vinaayak Kanagaraj" },
  { name: "Student 30",  email: "s30@campusconnect.test", role: "student", branch: "IT",  year: 1, githubUsername: "VIJAYADITYARV" },
  { name: "Student 31",  email: "s31@campusconnect.test", role: "student", branch: "CSE", year: 4, githubUsername: "midhunann" },
  { name: "Student 32",  email: "s32@campusconnect.test", role: "student", branch: "ECE", year: 2, githubUsername: "Harish1604 " },
  { name: "Student 33",  email: "s33@campusconnect.test", role: "student", branch: "CSE", year: 3, githubUsername: "VIJAYADITYARV" },
  { name: "Student 34",  email: "s34@campusconnect.test", role: "student", branch: "IT",  year: 4, githubUsername: "Kanishthika11" },
  { name: "Student 35",  email: "s35@campusconnect.test", role: "student", branch: "CSE", year: 1, githubUsername: "KiranRajeev-KV" },
  { name: "Student 36",  email: "s36@campusconnect.test", role: "student", branch: "EEE", year: 2, githubUsername: "paarthureddy" },
  { name: "Student 37",  email: "s37@campusconnect.test", role: "student", branch: "CSE", year: 3, githubUsername: "RiteeshTM" },
  { name: "Student 38",  email: "s38@campusconnect.test", role: "student", branch: "IT",  year: 4, githubUsername: "karthik-saiharsh" },
  { name: "Student 39",  email: "s39@campusconnect.test", role: "student", branch: "CSE", year: 2, githubUsername: "fingernailz" },
  { name: "Student 40",  email: "s40@campusconnect.test", role: "student", branch: "ECE", year: 1, githubUsername: "Anurup-R-Krishnan" },
  { name: "Student 41",  email: "s41@campusconnect.test", role: "student", branch: "CSE", year: 3, githubUsername: "hariPrasathK-Dev" },
  { name: "Student 42",  email: "s42@campusconnect.test", role: "student", branch: "IT",  year: 2, githubUsername: "Aashiq-Edavalapati" },
  { name: "Student 43",  email: "s43@campusconnect.test", role: "student", branch: "CSE", year: 4, githubUsername: "thilaganiniyavan" },
  { name: "Student 44",  email: "s44@campusconnect.test", role: "student", branch: "EEE", year: 3, githubUsername: "Tarika06 " },
  { name: "Student 45",  email: "s45@campusconnect.test", role: "student", branch: "CSE", year: 1, githubUsername: "priyansh-narang2308" },
  { name: "Student 46",  email: "s46@campusconnect.test", role: "student", branch: "IT",  year: 2, githubUsername: "yendelevium" },
  { name: "Student 47",  email: "s47@campusconnect.test", role: "student", branch: "CSE", year: 3, githubUsername: "Adhikkesh" },
];

// ── Domain selection (mirrors controller logic) ───────────────────────────────
function selectDiverseTopDomains(allSortedDomains) {
  const qualifying = allSortedDomains.filter(([, s]) => s > 0);
  const selected   = [];
  const aiOverflow = [];
  let aiCount = 0;

  for (const [domain] of qualifying) {
    if (selected.length >= TOP_N) break;
    if (AI_FAMILY.has(domain)) {
      if (aiCount >= AI_MAX) { aiOverflow.push(domain); continue; }
      aiCount++;
    }
    selected.push(domain);
  }

  if (selected.length < TOP_N && aiOverflow.length > 0) {
    selected.push(...aiOverflow.slice(0, TOP_N - selected.length));
  }
  return selected;
}

// ── Profile builder ───────────────────────────────────────────────────────────
function buildProfile(data) {
  const allSorted      = Object.entries(data.skills).sort((a, b) => b[1] - a[1]);
  const topDomainNames = selectDiverseTopDomains(allSorted);

  const topDomains = topDomainNames.map(domain => ({
    domain,
    score:   data.skills[domain] || 0,
    metrics: data.domainMetrics?.[domain] || { repos: 0, commits: 0, stars: 0, activeDays: 0 },
  }));

  const interests = topDomainNames
    .map(d => DOMAIN_INTEREST_MAP[d])
    .filter(Boolean);

  const skills = {
    languages:  data.rawSkills?.languages  || data.languages || [],
    frameworks: data.rawSkills?.frameworks || [],
    libraries:  data.rawSkills?.libraries  || [],
    databases:  data.rawSkills?.databases  || [],
    tools:      data.rawSkills?.tools      || [],
  };

  const normalizedSkills = [...new Set([
    ...skills.languages,
    ...skills.frameworks,
    ...skills.libraries,
    ...skills.databases,
    ...skills.tools,
  ].map(s => s.toLowerCase().trim()).filter(Boolean))];

  const repoSummaries = data.repoSummaries || [];

  return {
    topDomains,
    domainScores: data.skills || {},
    interests,
    skills,
    normalizedSkills,
    activityScore: data.activityScore,
    githubData: {
      languages:       data.languages,
      repos:           data.repos,
      stars:           data.stars,
      totalRepos:      data.totalRepos,
      processedRepos:  data.processedRepos,
      repoTypeCounts:  data.repoTypeCounts,
      repoSummaries,
      activityScore:   data.activityScore,
      scoringMode:     data.embeddingMode,
      semanticVersion: "v1",
      domainScores:    data.skills || {},
    },
  };
}

// ── Per-user seed ─────────────────────────────────────────────────────────────
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function seedOne(def, hashed) {
  const label = `${def.name} (@${def.githubUsername})`;
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${label}`);

  const baseDoc = { name: def.name, role: def.role };
  if (def.branch) baseDoc.branch = def.branch;
  if (def.year)   baseDoc.year   = def.year;

  const { value: existing } = await User.findOneAndUpdate(
    { email: def.email },
    { $set: baseDoc, $setOnInsert: { email: def.email, password: hashed } },
    { upsert: true, returnDocument: "before", includeResultMetadata: true }
  );
  const user = await User.findOne({ email: def.email });
  console.log(existing ? `  ~ updated existing user` : `  ✓ user created`);

  if (!def.githubUsername || def.githubUsername === "REPLACE_ME") {
    console.log(`  ⚠ skipped GitHub fetch — set a real githubUsername for ${def.name}`);
    return;
  }

  try {
    console.log(`  → fetching GitHub data ...`);
    const data    = await fetchGithubData(def.githubUsername);
    const profile = buildProfile(data);

    await User.findByIdAndUpdate(user._id, {
      githubUsername: def.githubUsername,
      ...profile,
    });

    const topStr       = profile.topDomains.map(d => d.domain).join(", ");
    const actStr       = data.activityScore?.toFixed(2) ?? "n/a";
    const typeCountStr = Object.entries(data.repoTypeCounts || {})
      .filter(([, n]) => n > 0)
      .map(([t, n]) => `${t}:${n}`)
      .join("  ");

    console.log(`  ✓ enriched`);
    console.log(`    repos       : ${data.totalRepos} total  [${typeCountStr}]`);
    console.log(`    activity    : ${actStr}`);
    console.log(`    top domains : ${topStr}`);
    console.log(`    languages   : ${(data.rawSkills?.languages || data.languages || []).slice(0, 6).join(", ")}`);

  } catch (err) {
    console.error(`  ✗ failed: ${err.message}`);
    if (process.env.DEBUG) console.error(err.stack);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (!process.env.MONGO_URI) {
    console.error("ERROR: MONGO_URI not set. Check your .env file.");
    process.exit(1);
  }

  console.log("Connecting to MongoDB ...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected.\n");

  const hashed = await bcrypt.hash(SEED_PASSWORD, 10);
  console.log(`Seeding ${SEED_USERS.length} students  (password: ${SEED_PASSWORD})  [NODE_ENV=${process.env.NODE_ENV}]`);

  for (const def of SEED_USERS) {
    await seedOne(def, hashed);
    await delay(1000);
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log("Done. All users seeded / refreshed.");
  await mongoose.disconnect();
}

main().catch(err => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
