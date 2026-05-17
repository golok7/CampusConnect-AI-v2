const { groqChat } = require("./groqClient");

const GROQ_MODEL = "llama-3.3-70b-versatile";

// ── JSON parser — brace-depth aware, handles nested objects ───────────────────
// The regex approach (/\{[\s\S]*\}/) fails on nested braces because it greedily
// matches from first { to last }, which can include trailing garbage. Brace
// counting finds the exact end of the outermost JSON object.
function parseGroqJson(raw) {
  const clean = raw.replace(/```(?:json)?/gi, "").trim();

  // Fast path: direct parse
  try { return JSON.parse(clean); } catch (_) {}

  // Slow path: find outermost { } by counting depth
  let depth = 0;
  let start = -1;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        try { return JSON.parse(clean.slice(start, i + 1)); } catch (_) {
          start = -1; // malformed — keep searching
        }
      }
    }
  }

  throw new Error("Could not parse Groq JSON response");
}

// ── Candidate summary builder ─────────────────────────────────────────────────
function buildCandidateSummary(user) {
  // Deduplicate across both skill sources so the prompt context is clean
  const skills = [
    ...new Set([
      ...(user.normalizedSkills       || []),
      ...(user.resumeNormalizedSkills || []),
    ]),
  ];

  const hasGithub = !!(user.githubData?.repoSummaries?.length);

  const domains = (user.topDomains || [])
    .map(d => `${d.domain}(${d.score})`)
    .join(", ") || "unknown";

  const repos = hasGithub
    ? (user.githubData.repoSummaries)
        .filter(r => r.semanticScore > 0)
        .sort((a, b) => b.semanticScore - a.semanticScore)
        .slice(0, 4)
        .map(r => `- ${r.repoName} [${r.dominantDomain}]: ${r.description || "no description"}`)
        .join("\n")
    : null;

  const projects = (user.resumeData?.projects || [])
    .slice(0, 4)
    .map(p => `- ${p.name}: ${(p.description || "").slice(0, 100)}`)
    .join("\n");

  const experience = (user.resumeData?.experience || [])
    .slice(0, 3)
    .map(e => `- ${e.role || "Role"} at ${e.company || "Company"}`)
    .join("\n");

  const certifications = (user.resumeData?.certifications || [])
    .map(c => c.name)
    .join(", ");

  const research = (user.resumeData?.research || [])
    .slice(0, 3)
    .map(r => `- "${r.title}" (${r.year || "n.d."})`)
    .join("\n");

  return { skills, domains, repos, projects, experience, certifications, research, hasGithub };
}

// ── Build the project upgrade section for the prompt ─────────────────────────
// We name existing projects/repos explicitly so LLM can reference real artifacts.
function buildUpgradeTargets(repos, projects) {
  const lines = [];
  if (repos) lines.push(...repos.split("\n").slice(0, 3));
  if (projects) lines.push(...projects.split("\n").slice(0, 2));
  return lines.join("\n") || null;
}

// ── Analyse JD vs profile ─────────────────────────────────────────────────────

async function analyseResumeVsJD(user, jobDescription) {
  const {
    skills, domains, repos, projects,
    experience, certifications, research, hasGithub,
  } = buildCandidateSummary(user);

  const upgradeTargets = buildUpgradeTargets(repos, projects);

  // Explicit fallback instruction when GitHub is absent — prevents LLM from
  // biasing suggestions toward GitHub activity the student doesn't have.
  const githubSection = hasGithub
    ? `GitHub repos (top 4 by semantic score):\n${repos}`
    : `GitHub repos: none — base all project suggestions on resume projects, experience, certifications, and research below. Do NOT suggest "add GitHub projects" as a generic tip.`;

  const researchSection = research
    ? `Research / publications:\n${research}`
    : "";

  const raw = await groqChat([
    {
      role: "system",
      content: `You are a senior career coach and technical resume advisor for campus students.
Analyse the gap between a student's profile and a target JD. Be specific — reference real project names, real skills, real experience from the profile.
Return ONLY valid JSON — no markdown, no extra text.`,
    },
    {
      role: "user",
      content: `Analyse this profile vs the job description and return improvement suggestions.

STUDENT PROFILE:
Name: ${user.name || "Student"}
Top domains: ${domains}
Deduplicated skills (GitHub + resume, top 30): ${skills.slice(0, 30).join(", ")}
${githubSection}
Resume projects:
${projects || "None listed"}
Work experience:
${experience || "None listed"}
Certifications: ${certifications || "None"}
${researchSection}

JOB DESCRIPTION:
${jobDescription.slice(0, 1800)}

EXISTING PROJECTS/REPOS TO CONSIDER FOR UPGRADES:
${upgradeTargets || "None available"}

Return this exact JSON (keep arrays concise — 3 items max each):
{
  "jdSummary": {
    "role": "extracted role title",
    "keySkills": ["top 6 skills the JD requires"],
    "preferredDomains": ["1-3 core technical domains"]
  },
  "skillGaps": [
    { "skill": "...", "priority": "high|medium|low", "howToLearn": "specific course, project, or practice approach" }
  ],
  "existingProjectUpgrades": [
    {
      "project": "name of an EXISTING project/repo from the profile above",
      "upgrade": "specific technical addition (e.g. Add Redis caching + Docker deployment)",
      "benefit": "what signal this sends to a recruiter for this specific role"
    }
  ],
  "newProjectSuggestions": [
    { "suggestion": "Build X that demonstrates Y", "relevance": "why valuable for this role" }
  ],
  "githubSuggestions": [
    { "action": "specific repo action or new repo idea", "impact": "recruiter signal it creates" }
  ],
  "resumeBullets": [
    "Rewritten bullet from existing experience that better targets this JD"
  ],
  "overallReadiness": {
    "score": 0-100,
    "summary": "2-sentence honest fit assessment",
    "quickWins": ["2-3 things they can do THIS WEEK to improve their chances"]
  }
}`,
    },
  ], { model: GROQ_MODEL, temperature: 0.4, maxTokens: 2000 });

  return parseGroqJson(raw);
}

module.exports = { analyseResumeVsJD };
