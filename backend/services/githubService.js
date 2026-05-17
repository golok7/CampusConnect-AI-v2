const { getAllRepos, getReadme, getProfileReadme, getDependencies, getContributorCommits, getCollaboratedRepos, getUserPullRequests } = require("./github/githubClient");
const { repoQualityScore, repoImportanceScore, repoRecencyScore, forkContributionScore, forkTier, forkMultiplier } = require("./scoring/repoScoring");
const { batchEmbedSummaries } = require("./semantic/voyageClient");
const { voyageToSemanticPrior, computeEmbeddingConfidence, computePriorEntropy, getKeywordRefinements, applyKeywordRefinements, normalizeDomainProbabilities, applyOverlapDampening } = require("./semantic/semanticPipeline");
const { MLOPS_REQUIRED_EVIDENCE, DOMAIN_RULES, DEP_MAP, DEPTH_SIGNAL_WEIGHTS, DEPTH_SCORE_NORMALIZER } = require("./semantic/ontology");
const { classifyRepo, getRepoWeight, scoreDomainsGuarded, isMlResearchRepo } = require("./classification/repoClassifier");
const { extractAllSkills, extractSkillsFromText } = require("./skills/extractSkills");
const { normalizeSkillName, ALIAS_TO_CATEGORY }   = require("./skills/skillOntology");
const { cleanText, sanitizeForSummary, buildSemanticSummary, match } = require("./utils/textUtils");

// ================= CONFIG =================
const ENRICH_LIMIT          = 30;
const PHASE1_FALLBACK_SCALE = 0.25;
const TOP_DOMAIN_MIN_RATIO  = 0.05; // domains scoring below 5% of top are noise, not specialization
const VOYAGE_MODEL          = "voyage-4-lite"; // keep for embeddingMode label

// ================= HELPERS =================

function hasMlOpsEvidence(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return MLOPS_REQUIRED_EVIDENCE.some(s => lower.includes(s));
}

// Language-based domain fallback for repos that produce no keyword/dep signal in Phase 1.
// Applies only when the repo has no other domain evidence — represents the weakest signal tier.
const LANGUAGE_DOMAIN_FALLBACK = {
  "jupyter notebook": "ai_ml",
  "python":           "ai_ml",
  "rust":             "systems",
  "go":               "backend",
  "kotlin":           "frontend",
  "dart":             "frontend",
  "haskell":          "algorithms",
  "c":                "systems",
  "c++":              "systems",
  "c#":               "backend",
  "java":             "backend",
  "ruby":             "backend",
  "php":              "backend",
  "shell":            "devops",
  "lua":              "devops",
  "emacs lisp":       "devops",
  "brainfuck":        "devops",
  "typst":            "devops",
  "svelte":           "frontend",
  "css":              "frontend",
  "html":             "frontend",
};

// Scores a repo's engineering depth from deps + readme + topics.
// Returns a value in [0, 1] — 1.0 means 3+ strong infra signals detected.
function computeDepthScore(deps, readme, topics) {
  const text  = `${deps} ${readme} ${(topics || []).join(" ")}`.toLowerCase();
  let   raw   = 0;
  for (const [token, weight] of Object.entries(DEPTH_SIGNAL_WEIGHTS)) {
    if (text.includes(token)) raw += weight;
  }
  return Math.min(raw / DEPTH_SCORE_NORMALIZER, 1.0);
}

// Returns the top-5 entries of an object sorted by value descending, rounded to 4dp.
function top5(obj) {
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k, v]) => [k, Math.round(v * 10000) / 10000])
  );
}

// ================= MAIN =================
exports.fetchGithubData = async (username) => {
  try {
    const [allReposRaw, profileReadme, collabRepos, userPRs] = await Promise.all([
      getAllRepos(username),
      getProfileReadme(username),
      getCollaboratedRepos(username),
      getUserPullRequests(username),
    ]);

    const allRepos = [...allReposRaw];
    const allRepoNames = new Set(allRepos.map(r => r.full_name));
    for (const repo of collabRepos) {
      if (!allRepoNames.has(repo.full_name)) {
        allRepos.push(repo);
        allRepoNames.add(repo.full_name);
      }
    }

    let teamworkScore = 0;
    const prScore = userPRs.length * 2;
    const collabRepoScore = collabRepos.length * 5;
    let starBonus = 0;
    for (const pr of userPRs) {
      if ((pr.repository?.stargazerCount || 0) > 100) starBonus += 5;
    }
    teamworkScore = prScore + collabRepoScore + starBonus;

    const repoContributions = {};
    const repoP1Domains     = {};

    let skillCounts     = {};
    let forkSkillCounts = {}; // tracks fork-origin contributions for the 35% cap
    let activityScore  = teamworkScore;
    let languages      = new Set();
    let totalStars     = 0;
    let processedCount = 0;

    const typeCounts = { project: 0, fork: 0, dsa: 0, course: 0, content: 0, config: 0, noise: 0 };
    const repoDebug    = {};
    const isDebug      = process.env.NODE_ENV !== "production";
    const isDeepDebug  = process.env.DEBUG_SEMANTICS === "true";

    // Cache classification results — each repo is regex-scanned once across all phases.
    const clsCache = new Map();
    const getCls   = repo => {
      if (!clsCache.has(repo.name)) clsCache.set(repo.name, classifyRepo(repo, username));
      return clsCache.get(repo.name);
    };

    // ── Phase 1: score ALL repos using metadata only ──
    for (const repo of allRepos) {
      const cls      = getCls(repo);
      const { type } = cls;
      const weight   = getRepoWeight(type);

      typeCounts[type] = (typeCounts[type] || 0) + 1;

      const metadata = cleanText(
        `${repo.name} ${repo.description || ""} ${(repo.topics || []).join(" ")}`, 500
      );
      const signals  = { metadata, readme: "", dependencies: "", language: repo.language || "" };
      const rawScore = Math.max(repoQualityScore(repo), 1);
      const score    = rawScore * weight;
      const domains  = scoreDomainsGuarded(signals, repo);

      if (type === "dsa" && !domains.algorithms) domains.algorithms = 0.5;

      repoP1Domains[repo.name]     = { ...domains };
      repoContributions[repo.name] = {};

      if (isDebug) repoDebug[repo.name] = { name: repo.name, type, finalDomains: null, scorePath: "pending" };

      if (repo.language) languages.add(repo.language);
      totalStars += repo.stargazers_count;
      if (["project", "fork", "dsa", "course"].includes(type)) activityScore += score;
      processedCount++;
    }

    // ── Phase 2: README + deps + Voyage AI embeddings ──
    // Fork inclusion: ANY of description/topics, recent activity, non-trivial size, or community.
    // Commit depth is unknown here (fetched in 2a) — metadata proxies decide the gate.
    const enrichCandidates = [...allRepos]
      .filter(r => {
        const { type } = getCls(r);
        if (["project", "dsa", "course"].includes(type)) return true;
        if (type === "fork") {
          const hasMetadata  = !!(r.description || (r.topics?.length || 0) > 0);
          const hasLanguage  = !!r.language;
          const hasActivity  = repoRecencyScore(r) > 0.5; // pushed within ~12 months
          const hasSize      = (r.size || 0) > 200;        // >200 KB
          const hasCommunity = (r.stargazers_count || 0) >= 1;
          return hasMetadata || (hasLanguage && (hasActivity || hasSize)) || hasCommunity;
        }
        return false;
      })
      .sort((a, b) => {
        const order = { project: 0, dsa: 1, course: 2, fork: 3 };
        const ta    = getCls(a).type;
        const tb    = getCls(b).type;
        return order[ta] !== order[tb]
          ? order[ta] - order[tb]
          : repoQualityScore(b) - repoQualityScore(a);
      })
      .slice(0, ENRICH_LIMIT);

    // ── 2a. Fetch READMEs, deps, and contributor stats in parallel ──
    const enriched = await Promise.all(
      enrichCandidates.map(async (repo) => {
        const owner = repo.owner.login;
        const [readme, deps, userCommits] = await Promise.all([
          getReadme(owner, repo.name),
          getDependencies(owner, repo.name),
          getContributorCommits(owner, repo.name, username),
        ]);
        return { repo, readme, deps, userCommits };
      })
    );

    const commitCounts  = new Map(enriched.map(({ repo, userCommits }) => [repo.name, userCommits]));
    const enrichedByName = new Map(enriched.map(({ repo, readme, deps }) => [repo.name, { readme: readme || "", deps: deps || "" }]));

    const nonZero = [...commitCounts.entries()].filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]);
    console.log(`[commits] ${nonZero.length}/${commitCounts.size} enriched repos have your commits`);

    // Replace Phase-1 quality estimates with real importance scores for enriched repos.
    // Phase 1 used repoQualityScore for all repos; now we have commit data for the top 30.
    for (const { repo } of enriched) {
      const { type }  = getCls(repo);
      const weight    = getRepoWeight(type);
      const commits   = commitCounts.get(repo.name) || 0;
      const oldRaw    = Math.max(repoQualityScore(repo), 1);

      let newRaw;
      if (type === "fork") {
        const tier = forkTier(repo, commits);
        if (tier === "passive_fork") {
          newRaw = 0; // remove Phase 1 quality estimate; passive forks don't contribute
        } else {
          newRaw = Math.max(forkContributionScore(repo, commits), 1);
          if (isDebug) console.log(`[fork-score] ${repo.name} — commits:${commits} multiplier:${forkMultiplier(commits).toFixed(2)} final:${newRaw.toFixed(2)}`);
        }
      } else {
        newRaw = Math.max(repoImportanceScore(repo, commits), 1);
      }

      activityScore += (newRaw - oldRaw) * weight;
    }

    // ── 2b. Sanitize inputs, then build semantic summaries for Voyage ──
    const sanitized = enriched.map(({ repo, readme, deps }) =>
      sanitizeForSummary(repo, readme, deps, isMlResearchRepo)
    );

    const summaries = sanitized.map(({ repo, readme }) =>
      buildSemanticSummary(repo, readme)
    );

    // ── 2c. Batch embed ALL summaries in ONE Voyage API call ──
    const embeddingResults = await batchEmbedSummaries(summaries);

    // ── 2d. Score each repo: Voyage semantic prior → keyword refinement → normalize ──
    for (let i = 0; i < enriched.length; i++) {
      const { repo, readme, deps } = enriched[i];
      const { type }  = getCls(repo);
      const weight    = getRepoWeight(type);
      const commits   = commitCounts.get(repo.name) || 0;
      const isFork    = type === "fork";
      const tier      = isFork ? forkTier(repo, commits) : "owned";

      // Passive forks contribute nothing to domain scoring.
      if (tier === "passive_fork") {
        if (isDebug && repoDebug[repo.name]) {
          repoDebug[repo.name].forkTier       = "passive_fork";
          repoDebug[repo.name].forkMultiplier = null;
          repoDebug[repo.name].forkReason     = `excluded: ${commits} commits, no qualifying signal`;
        }
        continue;
      }

      const rawScore = isFork
        ? Math.max(forkContributionScore(repo, commits), 1)
        : Math.max(repoImportanceScore(repo, commits), 1);
      const summary  = summaries[i];

      const embSims   = embeddingResults ? embeddingResults[i]?.sims ?? null : null;
      let confidence  = 0.6;
      let entropy     = 0;
      let capturedPrior       = null;
      let capturedRefinements = null;
      let p2Path              = "keyword-fallback";
      let finalDomains;

      if (embSims) {
        capturedPrior = voyageToSemanticPrior(embSims);

        const cb = computeEmbeddingConfidence(embSims);
        confidence = cb.confidence;
        entropy    = computePriorEntropy(capturedPrior);

        if (Object.keys(capturedPrior).length > 0) {
          const signals = {
            metadata:     cleanText(`${repo.name} ${repo.description || ""} ${(repo.topics || []).join(" ")}`, 500),
            readme,
            dependencies: sanitized[i].deps,
            language:     "",
          };
          const refinements = getKeywordRefinements(signals, sanitized[i].deps);
          const combined    = applyKeywordRefinements(capturedPrior, refinements);
          finalDomains      = normalizeDomainProbabilities(combined);

          capturedRefinements = refinements;
          p2Path              = "voyage+keyword";
        }
      }

      // Confidence attenuates lightly (±15%) — ambiguous repos should not be heavily penalized.
      // Recency is already baked into repoImportanceScore; do NOT apply it again here.
      const score = rawScore * weight * (0.85 + confidence * 0.15);

      if (!finalDomains) {
        // FALLBACK PATH: keyword-only with normalization (no Voyage or all sims too low)
        const signals = {
          metadata:     cleanText(`${repo.name} ${repo.description || ""} ${(repo.topics || []).join(" ")}`, 500),
          readme,
          dependencies: deps,
          language:     repo.language || "",
        };
        const raw   = scoreDomainsGuarded(signals, repo, deps);
        const total = Object.values(raw).reduce((s, v) => s + v, 0) || 1;
        finalDomains = Object.fromEntries(Object.entries(raw).map(([d, v]) => [d, v / total]));
      }

      // Ensure DSA repos always have algorithms in their profile
      if (type === "dsa" && !finalDomains.algorithms) {
        finalDomains.algorithms = 0.05;
        finalDomains = normalizeDomainProbabilities(finalDomains);
      }

      // Hard negative: Jupyter Notebook repos with no ML evidence are data science / EDA.
      if (repo.language?.toLowerCase() === "jupyter notebook" && finalDomains.ai_ml) {
        const mlEvidenceText = `${deps} ${readme} ${repo.name} ${repo.description || ""}`.toLowerCase();
        const trainingSignals = [
          "pytorch", "tensorflow", "transformers", "keras", "xgboost", "torch",
          "lightgbm", "catboost", "scikit-learn", "sklearn",
          "fit(", "train_test_split",
          "forecasting", "prediction", "classification", "regression",
          "neural network", "neural net", "deep learning", "machine learning",
        ];
        const hasTraining = trainingSignals.some(s => mlEvidenceText.includes(s));
        if (!hasTraining) {
          delete finalDomains.ai_ml;
          finalDomains = normalizeDomainProbabilities(finalDomains);
        }
      }

      // Soft gate: mlops without concrete evidence loses 50% of its signal.
      // Evidence includes tooling, infra primitives, and serving/deployment semantics
      // so Docker + Kubernetes + inference API repos are no longer false-negatives.
      const mlopsEvidenceText = `${deps} ${readme} ${repo.name} ${repo.description || ""}`;
      if (finalDomains.mlops && !hasMlOpsEvidence(mlopsEvidenceText)) {
        finalDomains.mlops *= 0.50;
        finalDomains = normalizeDomainProbabilities(finalDomains);
      }

      // Agentic gate: requires either a framework dep OR explicit in-text signal.
      // Without evidence, Voyage confuses LLM-wrapper repos with true agent systems.
      if (finalDomains.agentic_ai) {
        const AGENTIC_PACKAGES = [
          "crewai", "langgraph", "autogen", "google-adk", "pydantic-ai",
          "controlflow", "agno", "smolagents", "haystack-ai",
          "tambo", "parlant", "pipecat", "pipecat-ai", "livekit-agents",
        ];
        const AGENTIC_KEYWORDS = [
          "agentic", "multi-agent", "autonomous agent",
          "agent orchestration", "agent loop", "mcp", "langchain agent",
          "voice agent", "a2a", "agent sdk", "ai agents",
          "agentic ai", "agent framework", "agentic workflow",
        ];
        const combined = `${deps} ${readme} ${repo.name} ${repo.description || ""}`.toLowerCase();
        const hasEvidence = AGENTIC_PACKAGES.some(p => combined.includes(p)) ||
                            AGENTIC_KEYWORDS.some(k => combined.includes(k));
        if (!hasEvidence) {
          finalDomains.agentic_ai *= 0.10;
          finalDomains = normalizeDomainProbabilities(finalDomains);
        }
      }

      // ── Capture pre-dampening state for deep debug ──
      const preOverlapDomains = isDeepDebug ? { ...finalDomains } : null;

      finalDomains = applyOverlapDampening(finalDomains);

      // Compute which domains actually shifted so debug shows only meaningful changes.
      const dampeningChanges = {};
      if (preOverlapDomains) {
        for (const d of new Set([...Object.keys(preOverlapDomains), ...Object.keys(finalDomains)])) {
          const before = preOverlapDomains[d] || 0;
          const after  = finalDomains[d]      || 0;
          if (Math.abs(before - after) > 0.001) {
            dampeningChanges[d] = {
              before: parseFloat(before.toFixed(4)),
              after:  parseFloat(after.toFixed(4)),
            };
          }
        }
      }

      // Capture state before threshold strip for deep debug.
      const preThresholdDomains = isDeepDebug ? top5(finalDomains) : null;

      // Strip sub-threshold domains — anything below 6% probability is noise at the repo level.
      for (const d of Object.keys(finalDomains)) {
        if (finalDomains[d] < 0.06) delete finalDomains[d];
      }
      if (Object.keys(finalDomains).length > 0) {
        finalDomains = normalizeDomainProbabilities(finalDomains);
      }

      // Build per-domain contribution (probability × weighted score)
      // score already encodes commit significance via repoImportanceScore (45% weight on commitScore).
      // Do NOT apply an additional commit-based multiplier here — that double-counts commits.
      repoContributions[repo.name] = repoContributions[repo.name] || {};
      for (const d in finalDomains) {
        const c = finalDomains[d] * score;
        skillCounts[d]                  = (skillCounts[d] || 0) + c;
        repoContributions[repo.name][d] = (repoContributions[repo.name][d] || 0) + c;
        if (isFork) forkSkillCounts[d] = (forkSkillCounts[d] || 0) + c;
      }

      // ── Debug output ──
      if (isDeepDebug && repoDebug[repo.name]) {
        const metaText = cleanText(`${repo.name} ${repo.description || ""} ${(repo.topics || []).join(" ")}`, 500);
        const depsText = sanitized[i]?.deps || deps || "";

        // ── Evidence extraction (shared by trace log and repoDebug object) ──
        const kwList = [];
        for (const keywords of Object.values(DOMAIN_RULES)) {
          for (const kw of keywords) {
            if (match(metaText, kw) || match(readme, kw)) kwList.push(kw);
          }
        }
        const depList = [];
        for (const pkg of Object.keys(DEP_MAP)) {
          if (match(depsText, pkg)) depList.push(pkg);
        }
        const protoMatches = embSims
          ? Object.entries(embSims)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([domain, sim]) => ({ domain, sim: parseFloat(sim.toFixed(4)) }))
          : [];
        const weightedContrib = Object.fromEntries(
          Object.entries(finalDomains)
            .map(([d, p]) => [d, parseFloat((p * score).toFixed(3))])
            .sort((a, b) => b[1] - a[1])
        );

        // ── Per-repo console trace ──────────────────────────────────────────
        const recency = repoRecencyScore(repo);
        const mult    = isFork ? forkMultiplier(commits) : null;
        const pad     = (s, n) => String(s).padEnd(n);
        const f3      = v => Number(v).toFixed(3);
        const f4      = v => Number(v).toFixed(4);
        const SEP     = "─".repeat(68);

        const simLines = embSims
          ? Object.entries(embSims).sort((a, b) => b[1] - a[1]).slice(0, 10)
              .map(([d, s]) => `    ${pad(d, 24)} ${f4(s)}`).join("\n")
          : "    (no embeddings — keyword-only path)";

        const preLines = preOverlapDomains
          ? Object.entries(preOverlapDomains).sort((a, b) => b[1] - a[1])
              .map(([d, v]) => `    ${pad(d, 24)} ${f4(v)}`).join("\n")
          : "    (pre-dampening not captured)";

        const dampLines = Object.keys(dampeningChanges).length > 0
          ? Object.entries(dampeningChanges)
              .map(([d, { before, after }]) => {
                const pct = ((after / before - 1) * 100).toFixed(0);
                return `    ${pad(d, 24)} ${f4(before)} → ${f4(after)}  (${pct}%)`;
              }).join("\n")
          : "    (none)";

        const postLines = Object.entries(finalDomains).sort((a, b) => b[1] - a[1])
          .map(([d, v]) => `    ${pad(d, 24)} ${f4(v)}`).join("\n");

        const wLines = Object.entries(weightedContrib)
          .map(([d, v]) => `    ${pad(d, 24)} ${v}`).join("\n");

        console.log([
          `\n${SEP}`,
          `[TRACE:${repo.name}]  type:${type}  commits:${commits}  importance:${f3(rawScore)}  score:${f3(score)}`,
          `  recency:${f3(recency)}  weight:${weight}  confidence:${f3(confidence)}  entropy:${f3(entropy)}  path:${p2Path}`
            + (isFork ? `\n  forkTier:${tier}  forkMultiplier:${f3(mult)}` : ""),
          "",
          "  rawEmbeddingSims (top 10):",
          simLines,
          "",
          "  preDampening (after all gates, before overlap suppression):",
          preLines,
          "",
          "  dampeningChanges:",
          dampLines,
          "",
          "  postDampening (final normalized distribution):",
          postLines,
          "",
          "  weightedContribution (added to global domain tally):",
          wLines,
          "",
          `  keywords:  [${kwList.join(", ")}]`,
          `  deps:      [${depList.join(", ")}]`,
          SEP,
        ].join("\n"));
        // ───────────────────────────────────────────────────────────────────

        // ── repoDebug object (returned in API response) ──
        repoDebug[repo.name] = {
          name:       repo.name,
          repoType:   type,
          importance: parseFloat(rawScore.toFixed(3)),
          commits,
          ...(isFork && {
            forkTier,
            forkMultiplier: parseFloat(forkMultiplier(commits).toFixed(2)),
          }),

          preDampening:         preOverlapDomains ? top5(preOverlapDomains) : top5(finalDomains),
          postDampening:        top5(finalDomains),
          weightedContribution: weightedContrib,

          semanticEvidence: {
            path:             p2Path,
            confidence:       parseFloat(confidence.toFixed(3)),
            entropy:          parseFloat(entropy.toFixed(3)),
            voyagePrior:      capturedPrior ? top5(capturedPrior) : null,
            prototypeMatches: protoMatches,
            keywords:         kwList,
            dependencies:     depList,
          },
        };
      } else if (isDebug && repoDebug[repo.name]) {
        const mult = isFork ? forkMultiplier(commits) : null;
        repoDebug[repo.name].forkTier       = tier;
        repoDebug[repo.name].forkMultiplier = mult !== null ? parseFloat(mult.toFixed(2)) : null;
        repoDebug[repo.name].forkReason     = isFork
          ? `${commits >= 5 ? "contributor" : "metadata-signal"}: ${commits} commits × ${mult.toFixed(2)}`
          : null;
        repoDebug[repo.name].finalDomains   = top5(finalDomains);
      }
    }

    // ── Phase 2.5: Symbolic fallback for non-enriched repos ──
    // Repos outside the Phase 2 enrichment window apply Phase 1 keyword hints at reduced scale.
    const enrichedRepoNames = new Set(enriched.map(e => e.repo.name));

    for (const repo of allRepos) {
      if (enrichedRepoNames.has(repo.name)) continue;

      const { type } = getCls(repo);
      // Non-enriched forks failed the description+language+star filter → treat as passive.
      if (type === "fork") continue;

      const weight = getRepoWeight(type);
      const rawScore = Math.max(repoQualityScore(repo), 1);
      const score    = rawScore * weight * PHASE1_FALLBACK_SCALE * repoRecencyScore(repo);

      let p1Domains = repoP1Domains[repo.name] || {};
      if (Object.keys(p1Domains).length === 0) {
        const langKey    = (repo.language || "").toLowerCase();
        const langDomain = LANGUAGE_DOMAIN_FALLBACK[langKey];
        if (!langDomain) continue;
        p1Domains = { [langDomain]: 0.3 };
      }

      const total = Object.values(p1Domains).reduce((s, v) => s + v, 0) || 1;

      const p1Commits    = commitCounts.get(repo.name) || 0;
      const p1RepoWeight = Math.log2(p1Commits + 2);
      for (const d in p1Domains) {
        const c = (p1Domains[d] / total) * score * p1RepoWeight;
        skillCounts[d]                  = (skillCounts[d] || 0) + c;
        repoContributions[repo.name][d] = (repoContributions[repo.name][d] || 0) + c;
      }

      if (isDebug && repoDebug[repo.name]) {
        repoDebug[repo.name].finalDomains = top5(p1Domains);
        repoDebug[repo.name].scorePath    = "phase1-only";
      }
    }

    // ── Fork 35% cap ──────────────────────────────────────────────────────────
    // Prevents fork spam from dominating the profile even when heavily weighted.
    const grandTotal = Object.values(skillCounts).reduce((s, v) => s + v, 0);
    const forkTotal  = Object.values(forkSkillCounts).reduce((s, v) => s + v, 0);
    if (grandTotal > 0 && forkTotal > grandTotal * 0.45) {
      const scale = (grandTotal * 0.45) / forkTotal;
      console.log(`[fork-cap] fork contributions ${(forkTotal / grandTotal * 100).toFixed(1)}% → capping at 45% (scale ${scale.toFixed(3)})`);
      for (const d in forkSkillCounts) {
        const excess = forkSkillCounts[d] * (1 - scale);
        skillCounts[d] = Math.max(0, (skillCounts[d] || 0) - excess);
      }
    }

    const sorted = Object.entries(skillCounts).sort((a, b) => b[1] - a[1]);

    // A domain qualifies as "top" only if its score is at least 18% of the highest-scoring domain.
    const topScore        = sorted[0]?.[1] || 1;
    const qualifiedSorted = sorted.filter(([, score]) => score >= topScore * TOP_DOMAIN_MIN_RATIO);
    const topDomains      = qualifiedSorted.slice(0, 5).map(([d]) => d);

    // ── Per-domain metrics (repos / commits / stars per top domain) ──
    const domainMetrics = {};
    for (const domain of topDomains) {
      let dRepos = 0, dCommits = 0, dStars = 0;
      for (const repo of allRepos) {
        const contrib = repoContributions[repo.name] || {};
        if ((contrib[domain] || 0) > 0) {
          dRepos++;
          dCommits += commitCounts.get(repo.name) || 0;
          dStars   += repo.stargazers_count || 0;
        }
      }
      domainMetrics[domain] = { repos: dRepos, commits: dCommits, stars: dStars, activeDays: 0 };
    }

    // ── Total commits across all enriched repos ──
    const totalCommits = [...commitCounts.values()].reduce((s, v) => s + v, 0);

    // One compact final summary per fetch
    console.log(`[github] fetch complete — ${allRepos.length} repos, top domains: [${topDomains.join(", ")}], totalCommits: ${totalCommits}, activity: ${activityScore.toFixed(2)}`);

    // ── Aggregate raw skills ──────────────────────────────────────────────────
    // Sources (descending reliability):
    //   1. Profile README (raw markdown) — badge alt-text + tech sections + keywords
    //   2. Enriched repos — deps + topics + cleaned README + description
    //   3. All repos — topics + description (even non-enriched get coverage)
    const rawSkillSets = {
      languages:  new Set(),
      frameworks: new Set(),
      libraries:  new Set(),
      databases:  new Set(),
      tools:      new Set(),
    };

    function mergeInto(target, extracted) {
      for (const cat of Object.keys(target)) {
        for (const skill of (extracted[cat] || [])) target[cat].add(skill);
      }
    }

    // 1. Profile README — raw markdown preserves badges and section structure.
    if (profileReadme) {
      console.log(`[skills] extracting from profile README (${profileReadme.length} chars)`);
      mergeInto(rawSkillSets, extractSkillsFromText(profileReadme));
    }

    // 2. Enriched repos — full extraction: deps + topics + cleaned README + description.
    for (const { repo, readme, deps } of enriched) {
      mergeInto(rawSkillSets, extractAllSkills(deps, repo.topics, readme, repo.description || ""));
    }

    // 3. All repos — language detection + topics + description.
    for (const repo of allRepos) {
      // repo.language is GitHub's detected primary language — normalize through ontology.
      if (repo.language) {
        const display = normalizeSkillName(repo.language);
        if (display) {
          const cat = ALIAS_TO_CATEGORY.get(display);
          if (cat && rawSkillSets[cat]) rawSkillSets[cat].add(display);
        }
      }
      mergeInto(rawSkillSets, extractSkillsFromText(repo.description || ""));
      for (const topic of (repo.topics || [])) {
        const lower = topic.toLowerCase();
        const display =
          normalizeSkillName(lower.replace(/-/g, " ")) ||
          normalizeSkillName(lower);
        if (display) {
          const cat = ALIAS_TO_CATEGORY.get(display);
          if (cat && rawSkillSets[cat]) rawSkillSets[cat].add(display);
        }
      }
    }

    const rawSkills = {
      languages:  [...rawSkillSets.languages],
      frameworks: [...rawSkillSets.frameworks],
      libraries:  [...rawSkillSets.libraries],
      databases:  [...rawSkillSets.databases],
      tools:      [...rawSkillSets.tools],
    };

    return {
      languages:      Array.from(languages),
      totalRepos:     allRepos.length,
      processedRepos: processedCount,
      stars:          totalStars,
      totalCommits,
      skills:         skillCounts,
      rawSkills,
      topDomains,
      domainMetrics,
      activityScore,
      teamworkScore,
      repoTypeCounts: typeCounts,
      embeddingMode:  embeddingResults ? `semantic+${VOYAGE_MODEL}` : "keyword-only",
      repoDebug:      (isDeepDebug || isDebug) ? Object.values(repoDebug) : [],
      // All scored repos — used to build repoSummaries for domain evidence.
      // Intentionally wider than `repos` (display top-20) so no domain is starved.
      repoSummaries: allRepos
        .map(r => {
          const contrib  = repoContributions[r.name] || {};
          const topEntry = Object.entries(contrib).sort((a, b) => b[1] - a[1])[0];
          if (!topEntry) return null;
          const domains = Object.fromEntries(
            Object.entries(contrib)
              .filter(([, v]) => v >= 0.05)
              .map(([d, v]) => [d, Math.round(v * 1000) / 1000])
          );
          const enrichData = enrichedByName.get(r.name);
          const depthScore = enrichData
            ? computeDepthScore(enrichData.deps, enrichData.readme, r.topics)
            : 0;
          return {
            repoName:       r.name,
            dominantDomain: topEntry[0],
            semanticScore:  Math.round(topEntry[1] * 1000) / 1000,
            description:    r.description || null,
            domains,
            depthScore:     Math.round(depthScore * 1000) / 1000,
          };
        })
        .filter(Boolean),
      repos: [...allRepos]
        .filter(r => {
          const cls     = getCls(r);
          const commits = commitCounts.get(r.name) || 0;
          if (cls.type === "project") return true;
          if (cls.type === "fork" && forkTier(r, commits) === "fork_contributor") return true;
          return false;
        })
        .sort((a, b) => {
          const ca  = commitCounts.get(a.name) || 0;
          const cb  = commitCounts.get(b.name) || 0;
          const ta  = getCls(a).type;
          const tb  = getCls(b).type;
          const sa  = ta === "fork"
            ? forkContributionScore(a, ca)
            : (commitCounts.has(a.name) ? repoImportanceScore(a, ca) : repoQualityScore(a));
          const sb  = tb === "fork"
            ? forkContributionScore(b, cb)
            : (commitCounts.has(b.name) ? repoImportanceScore(b, cb) : repoQualityScore(b));
          return sb - sa;
        })
        .slice(0, 20)
        .map(r => {
          const cls     = getCls(r);
          const commits = commitCounts.get(r.name) || 0;
          const contrib = repoContributions[r.name] || {};
          const topEntry = Object.entries(contrib).sort((a, b) => b[1] - a[1])[0];
          return {
            name:           r.name,
            description:    r.description,
            language:       r.language,
            topics:         r.topics || [],
            repoType:             cls.type === "fork" ? "fork_contributor" : "owned",
            dominantDomain:       topEntry?.[0] || null,
            semanticContribution: topEntry ? Math.round(topEntry[1] * 1000) / 1000 : 0,
            userCommits:    commits,
          };
        }),
    };

  } catch (err) {
    console.error("githubService error:", err.message);
    throw new Error(err.message || "GitHub fetch failed");
  }
};