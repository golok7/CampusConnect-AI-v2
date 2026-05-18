import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { drivesApi, pipelineApi, searchApi, recommendApi } from "../services/api.js";
import {
  ArrowLeft, UserPlus, MagnifyingGlass, X, CaretDown,
  Robot, ArrowSquareOut, Trash, Users, FileText,
  Sparkle, CheckCircle, CalendarBlank, Tag,
} from "@phosphor-icons/react";

const STAGES = ["shortlisted", "interviewing", "offered", "rejected"];

const STAGE_STYLE = {
  shortlisted:  "text-sky-400   border-sky-500/30   bg-sky-500/10",
  interviewing: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  offered:      "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  rejected:     "text-rose-400  border-rose-500/30  bg-rose-500/10",
};

function Sk({ className }) {
  return <div className={`animate-pulse bg-zinc-800/60 rounded-md ${className}`} />;
}

const STAGE_FLOW = {
  shortlisted:  ["interviewing", "rejected"],
  interviewing: ["offered", "rejected"],
  offered:      ["rejected"],
  rejected:     ["shortlisted", "interviewing"],
};

const STAGE_LABEL = {
  shortlisted:  "Shortlisted",
  interviewing: "Interviewing",
  offered:      "Offered",
  rejected:     "Rejected",
};

// ─── Stage pill ───────────────────────────────────────────────────────────────

function StagePill({ entry, onStageChange }) {
  const [open, setOpen]     = useState(false);
  const [saving, setSaving] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);

  function handleOpen() {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen(v => !v);
  }

  useEffect(() => {
    if (!open) return;
    function close(e) {
      if (!btnRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  async function change(stage) {
    if (stage === entry.stage) { setOpen(false); return; }
    setSaving(true);
    try { await onStageChange(entry._id, stage); }
    finally { setSaving(false); setOpen(false); }
  }

  const nextStages = STAGE_FLOW[entry.stage] || STAGES.filter(s => s !== entry.stage);

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleOpen}
        disabled={saving}
        className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border capitalize font-medium transition-all shrink-0 ${STAGE_STYLE[entry.stage] || "text-zinc-500 border-zinc-700"}`}
      >
        {saving ? "…" : STAGE_LABEL[entry.stage] || entry.stage}
        <CaretDown size={9} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.1 }}
            style={{ position: "fixed", top: menuPos.top, left: menuPos.left, zIndex: 999 }}
            className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden min-w-[160px]"
          >
            <div className="px-3 pt-2.5 pb-1">
              <p className="text-[9px] uppercase tracking-widest text-zinc-600 font-semibold">Move to</p>
            </div>
            {nextStages.map(s => (
              <button key={s} onClick={() => change(s)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs capitalize font-medium hover:bg-zinc-800 transition-colors ${STAGE_STYLE[s]?.split(" ")[0] || "text-zinc-400"}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  s === "offered"      ? "bg-emerald-400" :
                  s === "interviewing" ? "bg-amber-400" :
                  s === "rejected"     ? "bg-rose-400" : "bg-sky-400"
                }`} />
                {STAGE_LABEL[s]}
              </button>
            ))}
            <div className="border-t border-zinc-800/60 mt-1">
              <button onClick={() => setOpen(false)}
                className="w-full px-3 py-2 text-xs text-zinc-600 hover:text-zinc-400 text-left transition-colors"
              >
                Keep as {STAGE_LABEL[entry.stage]}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── JD Panel ─────────────────────────────────────────────────────────────────

function JDPanel({ drive }) {
  const [open, setOpen] = useState(false);

  const deadline = drive?.deadline
    ? new Date(drive.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <div className="mb-5 rounded-xl border border-zinc-800/60 bg-zinc-900/40 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-900/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FileText size={13} className="text-cyan-400" weight="duotone" />
          <span className="text-xs font-semibold text-zinc-300">Drive Details & JD</span>
          {drive?.requiredSkills?.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-500 border border-zinc-700">
              {drive.requiredSkills.length} skills required
            </span>
          )}
        </div>
        <CaretDown size={13} className={`text-zinc-600 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-4 border-t border-zinc-800/60">

              {/* Meta row */}
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Tag size={12} className="text-zinc-600" />
                  <span className="capitalize">{drive?.type}</span>
                </div>
                {deadline && (
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <CalendarBlank size={12} className="text-zinc-600" />
                    Deadline: <span className="text-zinc-300">{deadline}</span>
                  </div>
                )}
              </div>

              {/* Description */}
              {drive?.description && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-semibold mb-2">Job Description</p>
                  <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">{drive.description}</p>
                </div>
              )}

              {/* Required skills */}
              {drive?.requiredSkills?.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-semibold mb-2">Required Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {drive.requiredSkills.map(s => (
                      <span key={s}
                        className="text-[11px] px-2.5 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/8 text-cyan-300"
                        style={{ background: "rgba(6,182,212,0.06)" }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Domain scores */}
              {drive?.domainScores && Object.keys(drive.domainScores).length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-semibold mb-2">Domain Weights</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(drive.domainScores)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 6)
                      .map(([domain, weight]) => (
                        <span key={domain}
                          className="text-[10px] px-2 py-0.5 rounded-md border border-zinc-700/60 bg-zinc-800/60 text-zinc-400"
                        >
                          {domain.replace(/_/g, " ")} · {Math.round(weight * 100)}%
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── AI Rank Modal ────────────────────────────────────────────────────────────

function AIRankModal({ driveId, driveTitle, existingIds, onAdd, onClose }) {
  const [loading,   setLoading]   = useState(true);
  const [results,   setResults]   = useState([]);
  const [error,     setError]     = useState("");
  const [adding,    setAdding]    = useState(false);
  const [addedAll,  setAddedAll]  = useState(false);
  const [addedIds,  setAddedIds]  = useState(new Set());

  useEffect(() => {
    recommendApi.candidates(driveId)
      .then(data => {
        const list = Array.isArray(data) ? data : (data.matches || data.results || []);
        setResults(list.slice(0, 10));
      })
      .catch(err => setError(err.message || "AI ranking failed"))
      .finally(() => setLoading(false));
  }, [driveId]);

  async function addTop10() {
    setAdding(true);
    const toAdd = results.filter(item => {
      const candidate = item.candidate || item.user || item;
      return !existingIds.has(candidate._id) && !addedIds.has(candidate._id);
    });

    const newAdded = new Set(addedIds);
    for (const item of toAdd) {
      const candidate = item.candidate || item.user || item;
      try {
        const entry = await pipelineApi.add({
          candidateId: candidate._id,
          driveId,
          jobTitle: driveTitle || "Campus Drive",
          stage: "shortlisted",
        });
        newAdded.add(candidate._id);
        onAdd({ ...entry.entry, candidateId: candidate });
      } catch { /* skip duplicates */ }
    }
    setAddedIds(newAdded);
    setAddedAll(true);
    setAdding(false);
  }

  const fitColor = (score) => {
    if (score == null) return "text-zinc-500";
    const pct = score <= 1 ? score * 100 : score;
    return pct >= 70 ? "text-emerald-400" : pct >= 50 ? "text-amber-400" : "text-rose-400";
  };

  const allAlreadyIn = results.length > 0 && results.every(item => {
    const candidate = item.candidate || item.user || item;
    return existingIds.has(candidate._id) || addedIds.has(candidate._id);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col max-h-[80vh]"
        style={{ boxShadow: "0 0 0 1px rgba(6,182,212,0.08), 0 24px 48px rgba(0,0,0,0.6)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <Sparkle size={13} weight="bold" className="text-cyan-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-200">AI Candidate Ranking</p>
              <p className="text-[10px] text-zinc-600 mt-0.5">Top 10 best matches for this drive</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center gap-3 py-12">
              <div className="w-5 h-5 rounded-full border-2 border-cyan-500/30 border-t-cyan-500 animate-spin" />
              <p className="text-sm text-zinc-500">Ranking candidates by AI fit score…</p>
            </div>
          )}

          {error && (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-rose-400">{error}</p>
            </div>
          )}

          {!loading && !error && results.length === 0 && (
            <div className="px-5 py-12 text-center">
              <Users size={28} className="text-zinc-700 mx-auto mb-3" weight="duotone" />
              <p className="text-sm text-zinc-600">No candidates found for this drive's requirements.</p>
            </div>
          )}

          {!loading && !error && results.map((item, i) => {
            const candidate = item.candidate || item.user || item;
            const fitScore  = item.fitScore ?? item.score ?? null;
            const pct       = fitScore != null
              ? Math.round(fitScore <= 1 ? fitScore * 100 : fitScore)
              : null;
            const alreadyIn = existingIds.has(candidate._id) || addedIds.has(candidate._id);

            return (
              <div key={candidate._id || i}
                className="flex items-center gap-3 px-5 py-3 border-b border-zinc-800/50 last:border-0"
              >
                <span className="w-5 text-right text-[11px] text-zinc-700 font-mono shrink-0">{i + 1}</span>
                <img
                  src={candidate.githubUsername
                    ? `https://github.com/${candidate.githubUsername}.png?size=36`
                    : `https://api.dicebear.com/7.x/initials/svg?seed=${candidate.name}`}
                  className="w-8 h-8 rounded-full bg-zinc-800 shrink-0 object-cover"
                  onError={e => { e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${candidate.name}`; }}
                  alt=""
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200 truncate">{candidate.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {candidate.githubUsername && (
                      <span className="text-[10px] text-zinc-600 font-mono">@{candidate.githubUsername}</span>
                    )}
                    {candidate.topDomains?.[0] && (
                      <span className="text-[10px] text-zinc-700 capitalize">
                        {candidate.topDomains[0].domain?.replace(/_/g, " ")}
                      </span>
                    )}
                    {[candidate.branch, candidate.year && `Y${candidate.year}`].filter(Boolean).map(t => (
                      <span key={t} className="text-[10px] text-zinc-700">{t}</span>
                    ))}
                  </div>
                </div>
                {pct != null && (
                  <div className="text-right shrink-0">
                    <p className={`text-base font-bold tabular-nums ${fitColor(fitScore)}`}>{pct}%</p>
                    <p className="text-[9px] text-zinc-700">fit</p>
                  </div>
                )}
                {alreadyIn && (
                  <div className="flex items-center gap-1 text-[11px] text-emerald-500 shrink-0">
                    <CheckCircle size={13} weight="fill" /> Added
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer with bulk-add button */}
        <div className="px-5 py-3 border-t border-zinc-800 flex items-center justify-between gap-3">
          <p className="text-[10px] text-zinc-700">
            {results.length > 0 && `${results.length} candidates ranked · skill & domain fit`}
          </p>
          {!loading && !error && results.length > 0 && (
            allAlreadyIn ? (
              <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
                <CheckCircle size={13} weight="fill" />
                All added to pipeline
              </div>
            ) : (
              <button
                onClick={addTop10}
                disabled={adding}
                className="flex items-center gap-2 px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 rounded-lg text-xs text-white font-medium transition-colors"
              >
                {adding ? (
                  <>
                    <div className="w-3 h-3 rounded-full border border-white/30 border-t-white animate-spin" />
                    Adding…
                  </>
                ) : (
                  <>
                    <UserPlus size={12} weight="bold" />
                    Add top {results.filter(item => {
                      const c = item.candidate || item.user || item;
                      return !existingIds.has(c._id) && !addedIds.has(c._id);
                    }).length} to pipeline
                  </>
                )}
              </button>
            )
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Add Candidate Modal ──────────────────────────────────────────────────────

function AddCandidateModal({ drive, existingIds, onAdd, onClose }) {
  const [query,     setQuery]     = useState("");
  const [results,   setResults]   = useState([]);
  const [searching, setSearching] = useState(false);
  const [adding,    setAdding]    = useState(null);

  async function search() {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const data = await searchApi.users({ limit: 500 });
      const q = query.toLowerCase();
      setResults(
        (data.results || data || []).filter(c =>
          !existingIds.has(c._id) &&
          (c.name?.toLowerCase().includes(q) || c.githubUsername?.toLowerCase().includes(q))
        )
      );
    } catch { setResults([]); }
    finally { setSearching(false); }
  }

  async function add(candidate) {
    setAdding(candidate._id);
    try {
      const entry = await pipelineApi.add({
        candidateId: candidate._id,
        jobTitle: drive.title,
        driveId: drive._id,
        stage: "shortlisted",
      });
      onAdd({ ...entry.entry, candidateId: candidate });
    } catch (err) { alert(err.message); }
    finally { setAdding(null); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-zinc-200">Add candidate</h3>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="flex gap-2 mb-4">
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && search()}
            placeholder="Name or GitHub username…"
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60"
          />
          <button onClick={search} disabled={searching}
            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-colors"
          >
            <MagnifyingGlass size={14} />
          </button>
        </div>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {searching ? [1,2,3].map(i => <Sk key={i} className="h-12 w-full" />) :
           results.length === 0 ? (
            <p className="text-xs text-zinc-600 text-center py-6">
              {query ? "No results — try a different name" : "Search to find candidates"}
            </p>
          ) : results.map(c => (
            <div key={c._id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800/60 transition-colors">
              <img
                src={c.githubUsername ? `https://github.com/${c.githubUsername}.png?size=32` : `https://api.dicebear.com/7.x/initials/svg?seed=${c.name}`}
                className="w-7 h-7 rounded-full bg-zinc-800 shrink-0"
                onError={e => { e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${c.name}`; }}
                alt=""
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-200 truncate">{c.name}</p>
                <p className="text-xs text-zinc-600">{c.githubUsername ? `@${c.githubUsername}` : c.email}</p>
              </div>
              <button onClick={() => add(c)} disabled={adding === c._id}
                className="text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 rounded px-2 py-0.5 transition-colors disabled:opacity-50"
              >
                {adding === c._id ? "…" : "Add"}
              </button>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Candidate row ────────────────────────────────────────────────────────────

function CandidateRow({ entry, index, onStageChange, onRemove }) {
  const candidate = entry.candidateId;
  const [removing, setRemoving] = useState(false);

  async function remove() {
    if (!confirm("Remove this candidate from the drive?")) return;
    setRemoving(true);
    try { await onRemove(entry._id); } finally { setRemoving(false); }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ delay: index * 0.04 }}
      className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800/60 last:border-0 hover:bg-zinc-900/30 transition-colors group"
    >
      <img
        src={candidate?.githubUsername
          ? `https://github.com/${candidate.githubUsername}.png?size=36`
          : `https://api.dicebear.com/7.x/initials/svg?seed=${candidate?.name}`}
        className="w-8 h-8 rounded-full bg-zinc-800 shrink-0 object-cover"
        onError={e => { e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${candidate?.name}`; }}
        alt=""
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-zinc-200 truncate">{candidate?.name || "Unknown"}</p>
          {candidate?.topDomains?.[0] && (
            <span className="text-[10px] text-zinc-600 hidden sm:block capitalize">
              {candidate.topDomains[0].domain?.replace(/_/g, " ")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {candidate?.githubUsername && <span className="text-xs text-zinc-600">@{candidate.githubUsername}</span>}
          {candidate?.activityScore != null && <span className="text-xs text-zinc-700 font-mono">{Math.round(candidate.activityScore)}</span>}
          {[candidate?.branch, candidate?.year && `Yr ${candidate.year}`].filter(Boolean).map(t => (
            <span key={t} className="text-xs text-zinc-700">{t}</span>
          ))}
        </div>
      </div>
      <div className="hidden md:flex gap-1 flex-wrap max-w-[160px]">
        {(candidate?.normalizedSkills || []).slice(0, 3).map(s => (
          <span key={s} className="text-[10px] px-1 py-0.5 bg-zinc-800/60 text-zinc-600 rounded">{s}</span>
        ))}
      </div>
      <StagePill entry={entry} onStageChange={onStageChange} />
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {candidate?.githubUsername && (
          <Link to={`/profile/${candidate.githubUsername}`}
            className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors" title="View profile"
          >
            <ArrowSquareOut size={13} />
          </Link>
        )}
        <button onClick={remove} disabled={removing}
          className="p-1 text-zinc-700 hover:text-rose-400 transition-colors" title="Remove"
        >
          <Trash size={13} />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DrivePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [drive,       setDrive]       = useState(null);
  const [candidates,  setCandidates]  = useState([]);
  const [applicants,  setApplicants]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [activeStage, setActiveStage] = useState("all");
  const [showAdd,     setShowAdd]     = useState(false);
  const [showAIRank,  setShowAIRank]  = useState(false);
  const [closing,     setClosing]     = useState(false);
  const [shortlisting, setShortlisting] = useState(null);
  const [shortlisted,  setShortlisted]  = useState(new Set());

  useEffect(() => {
    drivesApi.get(id)
      .then(data => {
        setDrive(data);
        setCandidates(data.candidates || []);
        setApplicants(data.applicants || []);
        // pre-mark applicants already in pipeline
        const existingStudentIds = new Set(
          (data.candidates || []).map(c =>
            typeof c.candidateId === "object" ? c.candidateId._id : c.candidateId
          )
        );
        setShortlisted(existingStudentIds);
      })
      .catch(err => setError(err.message || "Failed to load drive"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleStageChange = useCallback(async (entryId, stage) => {
    await pipelineApi.update(entryId, { stage });
    setCandidates(prev => prev.map(e => e._id === entryId ? { ...e, stage } : e));
  }, []);

  const handleRemove = useCallback(async (entryId) => {
    await pipelineApi.remove(entryId);
    setCandidates(prev => prev.filter(e => e._id !== entryId));
  }, []);

  const handleAdd = useCallback((entry) => {
    setCandidates(prev => {
      const alreadyIn = prev.some(e => {
        const cid = typeof e.candidateId === "object" ? e.candidateId._id : e.candidateId;
        const newCid = typeof entry.candidateId === "object" ? entry.candidateId._id : entry.candidateId;
        return cid === newCid;
      });
      return alreadyIn ? prev : [...prev, entry];
    });
  }, []);

  async function closeDrive() {
    if (!confirm("Close this drive? Candidates won't be notified.")) return;
    setClosing(true);
    try { const res = await drivesApi.close(id); setDrive(res.drive); }
    finally { setClosing(false); }
  }

  async function shortlistApplicant(applicant) {
    const student = applicant.student;
    if (!student) return;
    setShortlisting(student._id);
    try {
      const entry = await pipelineApi.add({
        candidateId: student._id,
        driveId: id,
        jobTitle: drive?.title || "Campus Drive",
        stage: "shortlisted",
      });
      setShortlisted(prev => new Set([...prev, student._id]));
      handleAdd({ ...entry.entry, candidateId: student });
    } catch (err) {
      if (!err.message?.includes("already")) alert(err.message);
      else setShortlisted(prev => new Set([...prev, student._id]));
    } finally {
      setShortlisting(null);
    }
  }

  const stageCounts = STAGES.reduce((acc, s) => {
    acc[s] = candidates.filter(c => c.stage === s).length;
    return acc;
  }, {});

  const filtered = activeStage === "all" ? candidates : candidates.filter(c => c.stage === activeStage);

  const existingIds = new Set(candidates.map(c =>
    typeof c.candidateId === "object" ? c.candidateId._id : c.candidateId
  ));

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        <Sk className="h-6 w-48" />
        <Sk className="h-4 w-80" />
        <div className="space-y-2 mt-6">{[1,2,3,4].map(i => <Sk key={i} className="h-14 w-full" />)}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 text-center">
        <p className="text-sm text-rose-400">{error}</p>
        <button onClick={() => navigate("/recruiter")} className="mt-3 text-xs text-zinc-500 hover:text-zinc-300">
          Back to dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="mb-5">
        <button
          onClick={() => navigate("/recruiter")}
          className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-300 transition-colors mb-4"
        >
          <ArrowLeft size={13} /> Back to dashboard
        </button>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-100">{drive?.title}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-md border capitalize ${
                drive?.status === "active"
                  ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                  : "border-zinc-700 text-zinc-500"
              }`}>
                {drive?.status}
              </span>
            </div>
            <p className="text-sm text-zinc-500 mt-0.5">
              {drive?.company} · <span className="capitalize">{drive?.type}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* AI rank — now a button, not a Link */}
            <button
              onClick={() => setShowAIRank(true)}
              className="flex items-center gap-2 px-3 py-1.5 border border-cyan-500/30 hover:border-cyan-500/60 bg-cyan-500/5 hover:bg-cyan-500/10 rounded-lg text-xs text-cyan-400 hover:text-cyan-300 font-medium transition-all"
            >
              <Sparkle size={13} weight="bold" />
              AI Rank Candidates
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs text-white font-medium transition-colors"
            >
              <UserPlus size={13} />
              Add candidate
            </button>
            {drive?.status === "active" && (
              <button
                onClick={closeDrive}
                disabled={closing}
                className="px-3 py-1.5 border border-zinc-800 hover:border-rose-500/40 hover:text-rose-400 rounded-lg text-xs text-zinc-600 transition-colors"
              >
                {closing ? "…" : "Close drive"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* JD Panel */}
      <JDPanel drive={drive} />

      {/* Stage tabs */}
      <div className="flex gap-1 mb-5 border-b border-zinc-800/60 overflow-x-auto scrollbar-none">
        {/* Applied tab — self-applied students */}
        <button
          onClick={() => setActiveStage("applied")}
          className={`px-3 py-2 text-sm transition-colors border-b-2 -mb-px whitespace-nowrap ${
            activeStage === "applied"
              ? "border-violet-500 text-zinc-100"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Applied
          {applicants.length > 0 && (
            <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
              activeStage === "applied" ? "bg-violet-500/20 text-violet-400" : "bg-zinc-800 text-zinc-500"
            }`}>
              {applicants.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveStage("all")}
          className={`px-3 py-2 text-sm transition-colors border-b-2 -mb-px whitespace-nowrap ${
            activeStage === "all" ? "border-emerald-500 text-zinc-100" : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Pipeline <span className="text-xs text-zinc-600 ml-1">{candidates.length}</span>
        </button>
        {STAGES.map(s => (
          <button key={s} onClick={() => setActiveStage(s)}
            className={`px-3 py-2 text-sm capitalize transition-colors border-b-2 -mb-px whitespace-nowrap ${
              activeStage === s ? "border-emerald-500 text-zinc-100" : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {s} <span className="text-xs text-zinc-600 ml-1">{stageCounts[s] || 0}</span>
          </button>
        ))}
      </div>

      {/* Applied list */}
      {activeStage === "applied" && (
        <div className="border border-zinc-800/60 rounded-xl" style={{ maxHeight: "calc(100vh - 360px)", overflowY: "auto" }}>
          {applicants.length === 0 ? (
            <div className="py-14 text-center">
              <Users size={28} className="text-zinc-700 mx-auto mb-3" weight="duotone" />
              <p className="text-sm text-zinc-600">No applications yet</p>
              <p className="text-xs text-zinc-700 mt-1">Students who apply will appear here</p>
            </div>
          ) : (
            <AnimatePresence>
              {applicants.map((app, i) => {
                const s = app.student;
                const isShortlisted = shortlisted.has(s?._id) || shortlisted.has(s?._id?.toString());
                return (
                  <motion.div
                    key={app._id || i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800/60 last:border-0 hover:bg-zinc-900/30 transition-colors"
                  >
                    <img
                      src={s?.githubUsername
                        ? `https://github.com/${s.githubUsername}.png?size=36`
                        : `https://api.dicebear.com/7.x/initials/svg?seed=${s?.name}`}
                      className="w-8 h-8 rounded-full bg-zinc-800 shrink-0 object-cover"
                      onError={e => { e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${s?.name}`; }}
                      alt=""
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-zinc-200 truncate">{s?.name || "Unknown"}</p>
                        {s?.topDomains?.[0] && (
                          <span className="text-[10px] text-zinc-600 capitalize hidden sm:block">
                            {s.topDomains[0].domain?.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {s?.githubUsername && <span className="text-xs text-zinc-600">@{s.githubUsername}</span>}
                        {s?.activityScore != null && <span className="text-xs text-zinc-700 font-mono">{Math.round(s.activityScore)}</span>}
                        {[s?.branch, s?.year && `Yr ${s.year}`].filter(Boolean).map(t => (
                          <span key={t} className="text-xs text-zinc-700">{t}</span>
                        ))}
                        <span className="text-[10px] text-zinc-700">
                          Applied {new Date(app.appliedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                    </div>
                    <div className="hidden md:flex gap-1 flex-wrap max-w-[160px]">
                      {(s?.normalizedSkills || []).slice(0, 3).map(sk => (
                        <span key={sk} className="text-[10px] px-1 py-0.5 bg-zinc-800/60 text-zinc-600 rounded">{sk}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {s?.githubUsername && (
                        <Link to={`/profile/${s.githubUsername}`}
                          className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors" title="View profile"
                        >
                          <ArrowSquareOut size={13} />
                        </Link>
                      )}
                      {isShortlisted ? (
                        <div className="flex items-center gap-1 text-[11px] text-emerald-500 font-medium">
                          <CheckCircle size={13} weight="fill" /> Shortlisted
                        </div>
                      ) : (
                        <button
                          onClick={() => shortlistApplicant(app)}
                          disabled={shortlisting === s?._id}
                          className="flex items-center gap-1.5 text-[11px] text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-500 border border-emerald-500/30 hover:border-emerald-500 rounded-lg px-3 py-1.5 transition-all disabled:opacity-50 font-medium"
                        >
                          {shortlisting === s?._id ? "…" : <><UserPlus size={11} /> Shortlist</>}
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      )}

      {/* Pipeline list */}
      {activeStage !== "applied" && (
        <div className="border border-zinc-800/60 rounded-xl" style={{ maxHeight: "calc(100vh - 360px)", overflowY: "auto" }}>
          <AnimatePresence>
            {filtered.length === 0 ? (
              <div className="py-14 text-center">
                <Users size={28} className="text-zinc-700 mx-auto mb-3" weight="duotone" />
                <p className="text-sm text-zinc-600">
                  {activeStage === "all" ? "No candidates in pipeline yet" : `No candidates in '${activeStage}'`}
                </p>
                {activeStage === "all" && (
                  <div className="flex items-center justify-center gap-3 mt-3">
                    <button onClick={() => setActiveStage("applied")}
                      className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
                    >
                      <Users size={11} /> View applications
                    </button>
                    <span className="text-zinc-800">·</span>
                    <button onClick={() => setShowAIRank(true)}
                      className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                    >
                      <Sparkle size={11} /> AI Rank
                    </button>
                    <span className="text-zinc-800">·</span>
                    <button onClick={() => setShowAdd(true)}
                      className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      Add manually
                    </button>
                  </div>
                )}
              </div>
            ) : (
              filtered.map((entry, i) => (
                <CandidateRow
                  key={entry._id}
                  entry={entry}
                  index={i}
                  onStageChange={handleStageChange}
                  onRemove={handleRemove}
                />
              ))
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Summary footer */}
      {activeStage !== "applied" && candidates.length > 0 && (
        <div className="flex items-center gap-4 mt-4 px-1">
          {STAGES.map(s => stageCounts[s] > 0 && (
            <span key={s} className={`text-xs capitalize ${STAGE_STYLE[s].split(" ")[0]}`}>
              {stageCounts[s]} {s}
            </span>
          ))}
        </div>
      )}

      {/* Modals */}
      {showAIRank && (
        <AIRankModal
          driveId={id}
          driveTitle={drive?.title}
          existingIds={existingIds}
          onAdd={handleAdd}
          onClose={() => setShowAIRank(false)}
        />
      )}
      {showAdd && (
        <AddCandidateModal
          drive={drive}
          existingIds={existingIds}
          onAdd={handleAdd}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}
