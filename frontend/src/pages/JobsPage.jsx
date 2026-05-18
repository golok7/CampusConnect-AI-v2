import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { jobsApi, resumeApi, recommendApi, drivesApi } from "../services/api.js";
import {
  Briefcase, Sparkle, MagnifyingGlass, Robot,
  X, ArrowDown, CaretDown,
} from "@phosphor-icons/react";

// ─── Analysis Panel (per-job AI fit analysis) ───────────────────────────────

function AnalysisPanel({ job, onClose }) {
  const [loading,      setLoading]      = useState(false);
  const [result,       setResult]       = useState(null);
  const [err,          setErr]          = useState("");
  const [ran,          setRan]          = useState(false);

  async function runAnalysis() {
    const skills = job.requiredSkills || job.extractedSkills || [];
    const jd = job.description || [
      job.title,
      job.company,
      skills.length ? `Required skills: ${skills.join(", ")}` : "",
    ].filter(Boolean).join("\n");

    setLoading(true); setErr(""); setResult(null);
    try {
      const r = await resumeApi.improve(jd);
      setResult(r.analysis || r);
      setRan(true);
    } catch (e) {
      setErr(e.message || "Analysis failed — make sure you have a resume uploaded.");
    } finally {
      setLoading(false);
    }
  }

  const readiness     = result?.overallReadiness || {};
  const fitScore      = readiness.score ?? null;
  const keySkills     = result?.jdSummary?.keySkills || [];
  const skillGaps     = result?.skillGaps || [];
  const quickWins     = readiness.quickWins || [];
  const upgrades      = result?.existingProjectUpgrades || [];
  const bullets       = result?.resumeBullets || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="border-t border-zinc-800/60 bg-zinc-950/80 px-5 py-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Robot size={14} className="text-cyan-400" weight="duotone" />
          <span className="text-xs font-semibold text-zinc-300">AI Fit Analysis</span>
          <span className="text-xs text-zinc-600">· {job.title} @ {job.company}</span>
        </div>
        <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 transition-colors">
          <X size={14} />
        </button>
      </div>

      {!ran && !loading && (
        <div className="flex flex-col items-center py-4 gap-3 text-center">
          <p className="text-sm text-zinc-400 max-w-sm">
            We'll compare your uploaded resume against this job's requirements and generate actionable improvements.
          </p>
          <button
            onClick={runAnalysis}
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
          >
            <Sparkle size={14} weight="bold" />
            Run Analysis
          </button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-3 py-8">
          <div className="w-5 h-5 rounded-full border-2 border-cyan-500/30 border-t-cyan-500 animate-spin" />
          <p className="text-sm text-zinc-500">Analyzing your resume against this JD…</p>
        </div>
      )}

      {err && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-sm text-rose-400">
          {err}
        </div>
      )}

      {result && (
        <div className="space-y-4">

          {/* Score + summary */}
          <div className="flex items-center gap-4 p-3 rounded-xl border border-zinc-800/60 bg-zinc-900/40">
            {fitScore != null && (
              <div className="shrink-0 text-center w-14">
                <p className={`text-2xl font-bold tabular-nums ${
                  fitScore >= 70 ? "text-emerald-400" : fitScore >= 50 ? "text-amber-400" : "text-rose-400"
                }`}>{fitScore}%</p>
                <p className="text-[9px] text-zinc-600 uppercase tracking-widest">Readiness</p>
              </div>
            )}
            {readiness.summary && (
              <p className="text-xs text-zinc-400 leading-relaxed flex-1">{readiness.summary}</p>
            )}
          </div>

          {/* Quick wins */}
          {quickWins.length > 0 && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="text-[9px] text-amber-500 uppercase tracking-widest mb-1.5">Quick Wins This Week</p>
              <ul className="space-y-1">
                {quickWins.map((w, i) => (
                  <li key={i} className="text-xs text-zinc-300 flex gap-2"><span className="text-amber-500 shrink-0">·</span>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Skill gaps */}
          {skillGaps.length > 0 && (
            <div>
              <p className="text-[9px] text-zinc-600 uppercase tracking-widest mb-2">Skill Gaps to Close</p>
              <div className="space-y-1.5">
                {skillGaps.map((g, i) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg border border-zinc-800/60 bg-zinc-900/30">
                    <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded border mt-0.5 capitalize font-semibold ${
                      g.priority === "high"   ? "border-rose-500/30 text-rose-400 bg-rose-500/10"
                      : g.priority === "medium" ? "border-amber-500/30 text-amber-400 bg-amber-500/10"
                      : "border-zinc-700 text-zinc-500"
                    }`}>{g.priority}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-zinc-200">{g.skill}</p>
                      {g.howToLearn && <p className="text-[10px] text-zinc-500 mt-0.5">{g.howToLearn}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* JD required skills */}
          {keySkills.length > 0 && (
            <div>
              <p className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1.5">JD Requires</p>
              <div className="flex flex-wrap gap-1">
                {keySkills.map(s => (
                  <span key={s} className="text-[10px] px-1.5 py-0.5 rounded border border-cyan-500/20 text-cyan-400 bg-cyan-500/5">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Project upgrades */}
          {upgrades.length > 0 && (
            <div>
              <p className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1.5">Upgrade Existing Projects</p>
              <div className="space-y-1.5">
                {upgrades.map((u, i) => (
                  <div key={i} className="p-2.5 rounded-lg border border-zinc-800/60 bg-zinc-900/30">
                    <p className="text-[11px] font-semibold text-cyan-400">{u.project}</p>
                    <p className="text-xs text-zinc-300 mt-0.5">{u.upgrade}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resume bullets */}
          {bullets.length > 0 && (
            <div>
              <p className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1.5">Stronger Resume Bullets</p>
              <div className="space-y-1">
                {bullets.map((b, i) => (
                  <p key={i} className="text-xs text-zinc-400 pl-2.5 border-l-2 border-cyan-500/30 leading-relaxed">{b}</p>
                ))}
              </div>
            </div>
          )}

          {/* Re-run */}
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="text-xs text-zinc-600 hover:text-zinc-400 flex items-center gap-1 transition-colors"
          >
            <ArrowDown size={11} /> Re-run analysis
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ─── Job Card ────────────────────────────────────────────────────────────────

function JobCard({ job, index, isRecommended }) {
  const [showAnalysis, setShowAnalysis] = useState(false);
  const fit = job.fitScore != null ? Math.round(job.fitScore * 100) : null;

  return (
    <div className="border-b border-zinc-800/60 last:border-0">
      <div className="px-5 py-4 bg-zinc-900/20 hover:bg-zinc-900/40 transition-colors">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-zinc-200">{job.title}</p>
              {isRecommended && fit != null && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${
                  fit >= 70 ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                  : fit >= 50 ? "text-amber-400 border-amber-500/30 bg-amber-500/10"
                  : "text-zinc-500 border-zinc-700"
                }`}>
                  {fit}% fit
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">{job.company} · {job.type || "Full-time"}</p>

            {(job.requiredSkills || job.extractedSkills)?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {(job.requiredSkills || job.extractedSkills).slice(0, 5).map(s => (
                  <span key={s} className="text-[10px] px-1.5 py-0.5 bg-zinc-800/60 text-zinc-500 rounded">{s}</span>
                ))}
                {(job.requiredSkills || job.extractedSkills).length > 5 && (
                  <span className="text-[10px] px-1.5 py-0.5 text-zinc-700">+{(job.requiredSkills || job.extractedSkills).length - 5}</span>
                )}
              </div>
            )}
          </div>

          <div className="shrink-0 flex flex-col items-end gap-2">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md border capitalize ${
              job.status === "active"
                ? "border-emerald-500/30 text-emerald-400"
                : "border-zinc-700 text-zinc-600"
            }`}>
              {job.status || "active"}
            </span>

            <button
              onClick={() => setShowAnalysis(v => !v)}
              className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-all ${
                showAnalysis
                  ? "bg-cyan-600/20 border border-cyan-500/30 text-cyan-400"
                  : "bg-zinc-800/60 border border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600"
              }`}
            >
              <Robot size={12} weight="duotone" />
              Analyze Fit
              <CaretDown size={10} className={`transition-transform ${showAnalysis ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showAnalysis && (
          <AnalysisPanel job={job} onClose={() => setShowAnalysis(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton({ className }) {
  return <div className={`animate-pulse bg-zinc-800/60 rounded-md ${className}`} />;
}

// ─── Jobs Page ───────────────────────────────────────────────────────────────

export default function JobsPage() {
  const [tab,     setTab]     = useState("recommended");
  const [recs,    setRecs]    = useState([]);
  const [all,     setAll]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [r, a] = await Promise.allSettled([
          recommendApi.jobs(),
          drivesApi.listActive(),
        ]);
        if (r.status === "fulfilled") {
          // recommendApi.jobs() returns [{ drive, score }] — flatten to drive objects with fitScore
          const raw = r.value || [];
          const mapped = raw.map(item =>
            item?.drive ? { ...item.drive, fitScore: item.score } : item
          ).filter(Boolean);
          setRecs(mapped);
        }
        if (a.status === "fulfilled") {
          setAll(Array.isArray(a.value) ? a.value : []);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const base     = tab === "recommended" ? recs : all;
  const filtered = base.filter(j =>
    !search ||
    j.title?.toLowerCase().includes(search.toLowerCase()) ||
    j.company?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-3xl mx-auto px-4 py-8">

        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Opportunities</h1>
          <p className="text-sm text-zinc-500 mt-1">Jobs and internships matched to your profile</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 border-b border-zinc-800/60">
          {[
            { id: "recommended", label: "Matched for you", Icon: Sparkle },
            { id: "all",         label: "All listings",    Icon: Briefcase },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors border-b-2 -mb-px ${
                tab === id
                  ? "border-emerald-500 text-zinc-100"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Icon size={13} weight={tab === id ? "fill" : "regular"} />
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter by title or company…"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>

        {/* List */}
        <div className="border border-zinc-800/60 rounded-xl overflow-hidden">
          {loading ? (
            <div className="divide-y divide-zinc-800/60">
              {[1,2,3,4].map(i => (
                <div key={i} className="px-5 py-4">
                  <Skeleton className="h-4 w-48 mb-2" />
                  <Skeleton className="h-3 w-32 mb-3" />
                  <div className="flex gap-1">{[1,2,3].map(j => <Skeleton key={j} className="h-5 w-16" />)}</div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center">
              <Briefcase size={28} className="text-zinc-700 mx-auto mb-3" weight="duotone" />
              <p className="text-sm text-zinc-600">
                {tab === "recommended"
                  ? "No matched jobs yet — connect GitHub to improve recommendations"
                  : "No jobs found"}
              </p>
            </div>
          ) : (
            filtered.map((job, i) => (
              <JobCard key={job._id || i} job={job} index={i} isRecommended={tab === "recommended"} />
            ))
          )}
        </div>

        <p className="text-xs text-zinc-700 mt-3 text-center">
          {filtered.length} listing{filtered.length !== 1 ? "s" : ""}
          {filtered.length > 0 && (
            <span className="ml-1">· click <span className="text-cyan-500">Analyze Fit</span> on any job for AI resume analysis</span>
          )}
        </p>

      </div>
    </div>
  );
}
