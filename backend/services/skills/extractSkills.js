const {
  SKILL_ONTOLOGY,
  ALIAS_TO_DISPLAY,
  ALIAS_TO_CATEGORY,
  normalizeSkillName,
  TEXT_KEYWORDS,
} = require("./skillOntology");

// ── Backward-compat maps (derived from ontology) ──────────────────────────────
// Any existing code that imports SKILLS_MAP or TOPIC_SKILLS_MAP continues to work.

const SKILLS_MAP = {};
const TOPIC_SKILLS_MAP = {};

for (const [category, skills] of Object.entries(SKILL_ONTOLOGY)) {
  for (const { display, aliases } of skills) {
    for (const alias of aliases) {
      const entry = { display, category };
      SKILLS_MAP[alias]                          = entry;
      TOPIC_SKILLS_MAP[alias]                    = entry;
      const hyphen = alias.replace(/ /g, "-");
      if (hyphen !== alias) TOPIC_SKILLS_MAP[hyphen] = entry;
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

function emptySkillSets() {
  return { languages: new Set(), frameworks: new Set(), libraries: new Set(), databases: new Set(), tools: new Set() };
}

function addSkill(sets, display) {
  const category = ALIAS_TO_CATEGORY.get(display);
  if (category && sets[category]) sets[category].add(display);
}

function mergeSkillSets(target, source) {
  for (const cat of Object.keys(target)) {
    for (const skill of (source[cat] || [])) target[cat].add(skill);
  }
}

// ── Badge / img alt-text extraction ──────────────────────────────────────────
// Handles raw markdown: ![alt](url) and HTML <img alt="..." />.
// Called on RAW text (not cleanText output) — profile READMEs are the main source.

function extractBadgeAlts(text) {
  const alts = new Set();

  // Markdown images: ![alt text](url)
  for (const m of text.matchAll(/!\[([^\]]{1,60})\]\([^)]+\)/g)) {
    alts.add(m[1].trim());
  }

  // HTML img tags — devicon / simpleicons patterns:
  //   <img src="..." alt="react logo" />
  //   <img alt="react" src="..." />
  for (const m of text.matchAll(/<img[^>]+>/gi)) {
    const altM = m[0].match(/alt=["']([^"']{1,60})["']/i);
    if (altM) alts.add(altM[1].trim());
  }

  return alts;
}

// ── Tech-section line extraction ──────────────────────────────────────────────
// Finds markdown headings that are tech/skills/stack sections and returns their text.
// Works on raw markdown (headings preserved) and gracefully degrades on cleaned text.

function extractTechSections(text) {
  const lines = text.split("\n");
  let inSection = false;
  const parts   = [];

  for (const line of lines) {
    const isHeading = /^#{1,4}\s/.test(line.trim());
    if (isHeading) {
      const lower = line.toLowerCase();
      inSection = /tech|skill|tool|stack|language|framework|librar|database|cloud|devops|develop/.test(lower);
    } else if (inSection) {
      parts.push(line);
    }
  }

  return parts.join(" ");
}

// ── extractSkillsFromText ─────────────────────────────────────────────────────
// Comprehensive text-based extraction. Works on both:
//   • Raw markdown (profile READMEs) — enables badge + section extraction.
//   • Cleaned text (cleanText output) — falls back to keyword matching only.
// Returns { frameworks, libraries, databases, tools } as Sets.

function extractSkillsFromText(text) {
  if (!text) return emptySkillSets();
  const out = emptySkillSets();

  // 1. Badge / img alt texts — highest confidence.
  //    Strip trailing " logo" / " icon" suffixes common in devicon alt texts.
  for (let alt of extractBadgeAlts(text)) {
    const clean = alt.replace(/\s+(logo|icon|badge|original|plain|colored)$/i, "").trim();
    for (const candidate of [alt, clean]) {
      const display = normalizeSkillName(candidate);
      if (display) { addSkill(out, display); break; }
    }
  }

  // 2. Tech-section token extraction — medium confidence.
  const sectionText = extractTechSections(text);
  if (sectionText) {
    const tokens = sectionText
      .split(/[,|·•\n\t]+/)
      .map(t => t.trim().replace(/^[-*]\s*/, ""))
      .filter(t => t.length > 1 && t.length < 35);
    for (const tok of tokens) {
      const display = normalizeSkillName(tok);
      if (display) addSkill(out, display);
    }
  }

  // 3. Full-text keyword matching (TEXT_KEYWORDS — pre-vetted for safety).
  const lower = text.toLowerCase();
  for (const [alias, display] of TEXT_KEYWORDS) {
    const matched = alias.includes(" ")
      ? lower.includes(alias)
      : new RegExp(`\\b${escapeRegex(alias)}\\b`).test(lower);
    if (matched) addSkill(out, display);
  }

  return out;
}

// ── extractRawSkills ──────────────────────────────────────────────────────────
// Dep-based + topic extraction (backward-compatible API).
// cleanedDeps — output of getDependencies() (cleanText already applied).
// topics      — raw strings from repo.topics[], NOT cleaned.

function extractRawSkills(cleanedDeps, topics) {
  const out = emptySkillSets();

  if (cleanedDeps) {
    for (const [alias, display] of ALIAS_TO_DISPLAY) {
      const category = ALIAS_TO_CATEGORY.get(display);
      if (!category || !out[category]) continue;
      const matched = alias.includes(" ")
        ? cleanedDeps.includes(alias)
        : new RegExp(`\\b${escapeRegex(alias)}\\b`).test(cleanedDeps);
      if (matched) out[category].add(display);
    }
  }

  for (const topic of (topics || [])) {
    const lower = topic.toLowerCase();
    // Try space form and hyphen form (GitHub topics use hyphens).
    const display =
      normalizeSkillName(lower.replace(/-/g, " ")) ||
      normalizeSkillName(lower);
    if (display) addSkill(out, display);
  }

  return out;
}

// ── extractAllSkills ──────────────────────────────────────────────────────────
// Combines dep/topic extraction with README and description text matching.
// Use this for enriched repos where all four sources are available.

function extractAllSkills(cleanedDeps, topics, readme, description) {
  const out = extractRawSkills(cleanedDeps, topics);
  // readme may be cleanText output (no markdown structure) — keyword matching still works.
  if (readme)      mergeSkillSets(out, extractSkillsFromText(readme));
  if (description) mergeSkillSets(out, extractSkillsFromText(description));
  return out;
}

module.exports = {
  SKILLS_MAP,
  TOPIC_SKILLS_MAP,
  extractRawSkills,
  extractAllSkills,
  extractSkillsFromText,
};
