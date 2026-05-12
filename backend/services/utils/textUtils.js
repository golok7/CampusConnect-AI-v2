// Skip patterns for README lines that are setup/navigation noise, not project purpose
const README_SKIP_STARTS = [
  "table of contents", "installation", "getting started", "prerequisites",
  "usage", "license", "contributing", "setup", "requirements", "running",
  "deployment", "configuration", "testing", "dependencies", "built with",
  "tech stack", "todo", "roadmap", "changelog", "acknowledgement", "credit",
  "contact", "support", "note:", "warning:", "quickstart", "how to",
];

// Heading names that reliably introduce purpose-describing content.
// Generalised around implementation/runtime semantics — not tied to any ontology category.
const README_PREFER_SECTIONS = [
  "overview", "about", "introduction", "what is", "what does",
  "features", "description", "project description", "summary",
  // Implementation / runtime / architecture — generic engineering sections
  "architecture", "system architecture", "design", "system design",
  "implementation", "internals", "how it works",
  "workflow", "pipeline",
  "api", "apis", "endpoints", "routes",
  "backend", "services", "infrastructure", "runtime",
];

function match(text, keyword) {
  return new RegExp(`\\b${keyword}\\b`, "i").test(text);
}

function cleanText(text, limit = 2000) {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, limit);
}

function isBoilerplateDeps(text) {
  const boilerplateSignals = [
    "repl-nix", "replit", "template", "jumpstart", "starter-kit", "create-next-app",
  ];
  const lower = text.toLowerCase();
  return boilerplateSignals.some(s => lower.includes(s));
}

function extractReadmePurpose(readmeText, maxChars = 300) {
  if (!readmeText) return "";

  const rawLines = readmeText.split(/\n+/);

  function cleanLine(l) {
    return l.trim()
      .replace(/^#+\s*/, "")
      .replace(/\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .trim();
  }

  function isNoisyLine(line) {
    if ((line.match(/https?:\/\//g) || []).length > 1) return true;
    if (/^(\$\s|npm |pip |yarn |git |cd |echo |curl |wget |docker |make |mvn )/.test(line)) return true;
    if (/^\[!\[/.test(line)) return true;
    if (/^[\w\-]+==[0-9]/.test(line)) return true;
    const lower = line.toLowerCase();
    if (README_SKIP_STARTS.some(s => lower.startsWith(s))) return true;
    return false;
  }

  // Pass 1: collect lines that appear under a preferred section heading
  const preferredLines = [];
  let inPreferredSection = false;
  for (const raw of rawLines) {
    const trimmed = raw.trim();
    if (/^#+\s*/.test(trimmed)) {
      const heading = trimmed.replace(/^#+\s*/, "").toLowerCase();
      inPreferredSection = README_PREFER_SECTIONS.some(s => heading.startsWith(s));
      continue;
    }
    if (inPreferredSection) {
      const cleaned = cleanLine(raw);
      if (cleaned.length >= 25 && !isNoisyLine(cleaned)) {
        preferredLines.push(cleaned);
        if (preferredLines.join(" ").length >= maxChars) break;
      }
    }
  }

  // Pass 2: sequential scan as fallback
  const allLines = rawLines.map(cleanLine).filter(l => l.length >= 25);
  const candidates = preferredLines.length >= 2 ? preferredLines : allLines;

  const picked = [];
  for (const line of candidates) {
    if (picked.join(" ").length >= maxChars) break;
    if (isNoisyLine(line)) continue;
    picked.push(line);
    if (picked.length >= 6) break;
  }

  return picked.join(" ").slice(0, maxChars) || readmeText.slice(0, maxChars);
}

// Sanitize repo signals BEFORE building the semantic summary for Voyage.
// Removes dependency file noise that would mislead the embedding.
function sanitizeForSummary(repo, readme, deps, isMlResearchRepo) {
  let cleanDeps = deps;

  if (isBoilerplateDeps(deps)) cleanDeps = "";

  // For ML research repos: web framework package names in deps are transitive/dev
  // dependencies that don't reflect the repo's purpose — strip them before embedding.
  if (isMlResearchRepo(repo, deps)) {
    const webNoise = [
      "express", "fastapi", "flask", "django", "react", "nextjs",
      "vue", "angular", "node", "svelte",
    ];
    for (const pkg of webNoise) {
      cleanDeps = cleanDeps.replace(new RegExp(`\\b${pkg}\\b`, "gi"), " ");
    }
  }

  return { repo, readme, deps: cleanDeps };
}

function buildSemanticSummary(repo, readmeText) {
  // Deps are excluded from the embedding input — package names pollute semantic meaning
  // and are applied separately as keyword refinements after Voyage scores the repo's purpose.
  // README is placed before description: it contains richer implementation/runtime semantics
  // while GitHub descriptions tend to be marketing-prose that inflates ai_ml/genai signals.
  const readmePurpose = extractReadmePurpose(readmeText, 600);

  return [
    repo.name.replace(/[-_]/g, " "),
    readmePurpose,
    (repo.topics || []).slice(0, 8).join(" "),
    repo.description || "",
    repo.language || "",
  ]
    .filter(Boolean)
    .join(" | ");
}

module.exports = {
  match,
  cleanText,
  isBoilerplateDeps,
  extractReadmePurpose,
  sanitizeForSummary,
  buildSemanticSummary,
};
