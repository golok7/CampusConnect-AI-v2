/**
 * seedUsers.js — Seed the platform with real GitHub profiles.
 *
 * Usage (from the backend/ directory):
 *   node scripts/seedUsers.js
 *
 * BEFORE RUNNING:
 *   1. Fill in real GitHub usernames in SEED_USERS below.
 *   2. Ensure MONGO_URI and GITHUB_TOKEN are set in .env
 *      (GITHUB_TOKEN is optional but strongly recommended to avoid rate limits).
 *   3. Each GitHub account must be public with at least 2-3 repos.
 *
 * Behaviour:
 *   - If a user does NOT exist → creates them, then fetches GitHub data.
 *   - If a user ALREADY exists → skips creation, only refetches GitHub data.
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

// Ensure repoDebug is populated (gated by NODE_ENV !== "production").
if (!process.env.NODE_ENV || process.env.NODE_ENV === "production") {
  process.env.NODE_ENV = "development";
}

const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");
const User     = require("../models/User");
const { fetchGithubData }                            = require("../services/githubService");
const { AI_FAMILY, TOP_N, AI_MAX, DOMAIN_INTEREST_MAP } = require("../constants/domains");

// ── Seed data ─────────────────────────────────────────────────────────────────
const SEED_PASSWORD = "Test@1234";

const SEED_USERS = [
  // ── Students ──────────────────────────────────────────────────────────────
  { name: "Arjun Sharma",    email: "s1@campusconnect.test",  role: "student", branch: "CSE", year: 3, githubUsername: "akshayks13" },
  { name: "Priya Menon",     email: "s2@campusconnect.test",  role: "student", branch: "CSE", year: 2, githubUsername: "Sri-Krishna-V" },
  { name: "Rohan Nair",      email: "s3@campusconnect.test",  role: "student", branch: "ECE", year: 4, githubUsername: "Gowreesh1905" },
  { name: "Sneha Krishnan",  email: "s4@campusconnect.test",  role: "student", branch: "CSE", year: 3, githubUsername: "s4nj1th" },
  { name: "Dev Patel",       email: "s5@campusconnect.test",  role: "student", branch: "IT",  year: 2, githubUsername: "SaiNivedh26" },
  { name: "Aisha Rao",       email: "s6@campusconnect.test",  role: "student", branch: "CSE", year: 4, githubUsername: "Shan713" },
  { name: "Kiran Bhat",      email: "s7@campusconnect.test",  role: "student", branch: "CSE", year: 1, githubUsername: "adithya-menon-r" },
  { name: "Meera Pillai",    email: "s8@campusconnect.test",  role: "student", branch: "EEE", year: 3, githubUsername: "SudharsanSaravanan" },
  { name: "Rahul Verma",     email: "s9@campusconnect.test",  role: "student", branch: "CSE", year: 2, githubUsername: "Dharshan2208" },
  { name: "Divya Nair",      email: "s10@campusconnect.test", role: "student", branch: "IT",  year: 3, githubUsername: "VasudevKishor" },
  { name: "Amit Joshi",      email: "s11@campusconnect.test", role: "student", branch: "CSE", year: 4, githubUsername: "vijay-sb" },
  { name: "Lakshmi Iyer",    email: "s12@campusconnect.test", role: "student", branch: "ECE", year: 1, githubUsername: "dharun-narayanan" },
  { name: "Nikhil Reddy",    email: "s13@campusconnect.test", role: "student", branch: "CSE", year: 2, githubUsername: "JrGkOG" },
  { name: "Pooja Desai",     email: "s14@campusconnect.test", role: "student", branch: "IT",  year: 4, githubUsername: "nimaldanyathk" },
  { name: "Siddharth Rao",   email: "s15@campusconnect.test", role: "student", branch: "CSE", year: 3, githubUsername: "SajeevSenthil" },
  { name: "Kavya Menon",     email: "s16@campusconnect.test", role: "student", branch: "EEE", year: 2, githubUsername: "Santhosh292K" },
  { name: "Harsh Gupta",     email: "s17@campusconnect.test", role: "student", branch: "CSE", year: 1, githubUsername: "Astrasv" },
  { name: "Ananya Singh",    email: "s18@campusconnect.test", role: "student", branch: "IT",  year: 3, githubUsername: "aadit-n3rdy" },
  { name: "Vishnu Kumar",    email: "s19@campusconnect.test", role: "student", branch: "CSE", year: 4, githubUsername: "Raamprathap" },
  { name: "Shreya Pillai",   email: "s20@campusconnect.test", role: "student", branch: "ECE", year: 2, githubUsername: "Keerthivasan-Venkitajalam" },
  { name: "Aditya Bose",     email: "s21@campusconnect.test", role: "student", branch: "CSE", year: 3, githubUsername: "SaranDharshanSP" },
  { name: "Nandini Krishnan",email: "s22@campusconnect.test", role: "student", branch: "IT",  year: 1, githubUsername: "IAmRiteshKoushik" },
  { name: "Pranav Mehta",    email: "s23@campusconnect.test", role: "student", branch: "CSE", year: 2, githubUsername: "RD-Tarun" },
  { name: "Riya Chatterjee", email: "s24@campusconnect.test", role: "student", branch: "EEE", year: 4, githubUsername: "Barathj121" },
  { name: "Suresh Nambiar",  email: "s25@campusconnect.test", role: "student", branch: "CSE", year: 3, githubUsername: "TharunKumarrA" },
  { name: "Tanya Malhotra",  email: "s26@campusconnect.test", role: "student", branch: "IT",  year: 2, githubUsername: "Sajithrajan03" },
  { name: "Yash Patil",      email: "s27@campusconnect.test", role: "student", branch: "CSE", year: 1, githubUsername: "sandy-sachin7" },
  // ── Faculty ───────────────────────────────────────────────────────────────
  { name: "Dr. Anand Kumar", email: "f1@campusconnect.test",  role: "faculty",   branch: "CSE", year: null, githubUsername: "REPLACE_ME" },
  { name: "Dr. Priya Iyer",  email: "f2@campusconnect.test",  role: "faculty",   branch: "IT",  year: null, githubUsername: "REPLACE_ME" },
  // ── Recruiter ─────────────────────────────────────────────────────────────
  { name: "Talent Desk",     email: "r1@campusconnect.test",  role: "recruiter", branch: null,  year: null, githubUsername: "REPLACE_ME" },
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

// ── Debug printer ─────────────────────────────────────────────────────────────
function printRepoDebug(repoDebug) {
  if (!Array.isArray(repoDebug) || repoDebug.length === 0) return;

  // Only show repos that made it through Phase 2 (have finalDomains)
  const enriched = repoDebug.filter(r => r.finalDomains && Object.keys(r.finalDomains).length > 0);
  const skipped  = repoDebug.filter(r => !r.finalDomains || Object.keys(r.finalDomains).length === 0);

  console.log(`\n  ┌─ repo debug (${enriched.length} enriched, ${skipped.length} skipped/noise) ───────────`);

  for (const r of enriched) {
    const domStr = Object.entries(r.finalDomains)
      .map(([d, s]) => `${d}(${s})`)
      .join("  ");
    console.log(`  │  [${r.type.padEnd(8)}] ${r.name}`);
    console.log(`  │            ${domStr}`);
  }

  if (skipped.length > 0) {
    const byType = {};
    for (const r of skipped) byType[r.type] = (byType[r.type] || 0) + 1;
    const skipSummary = Object.entries(byType).map(([t, n]) => `${t}:${n}`).join("  ");
    console.log(`  │  skipped → ${skipSummary}`);
  }

  console.log(`  └───────────────────────────────────────────────────────\n`);
}

// ── Per-user seed ─────────────────────────────────────────────────────────────
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function seedOne(def, hashed) {
  const label = `${def.name} (@${def.githubUsername})`;
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${label}`);

  // ── Upsert base profile — always, whether the user exists or not ────────
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

  // ── Skip placeholder usernames ──────────────────────────────────────────
  if (!def.githubUsername || def.githubUsername === "REPLACE_ME") {
    console.log(`  ⚠ skipped GitHub fetch — set a real githubUsername for ${def.name}`);
    return;
  }

  // ── Fetch GitHub data and update profile ────────────────────────────────
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
    console.log(`    scoring     : ${data.embeddingMode}`);
    console.log(`    languages   : ${(data.rawSkills?.languages || data.languages || []).slice(0, 6).join(", ")}`);

    printRepoDebug(data.repoDebug);

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

  const allPlaceholder = SEED_USERS.every(u => !u.githubUsername || u.githubUsername === "REPLACE_ME");
  if (allPlaceholder) {
    console.warn("WARNING: All githubUsername values are still REPLACE_ME.");
    console.warn("         Users will be created without GitHub enrichment.\n");
  }

  console.log("Connecting to MongoDB ...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected.\n");

  const hashed = await bcrypt.hash(SEED_PASSWORD, 10);
  console.log(`Seeding ${SEED_USERS.length} users  (password: ${SEED_PASSWORD})  [NODE_ENV=${process.env.NODE_ENV}]`);

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
