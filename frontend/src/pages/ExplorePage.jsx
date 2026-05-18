import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { searchApi } from "../services/api.js";
import { getDomainConfig } from "../constants/domains.js";
import FilterModal from "../components/explore/FilterModal.jsx";
import DeveloperCard from "../components/explore/DeveloperCard.jsx";
import { FileText, X, Sparkle, CaretDown } from "@phosphor-icons/react";

// ─── Constants ───────────────────────────────────────────────────────────────

const EMPTY_FILTERS = { domains: [], skills: [], years: [], branches: [], activity: null };
const LIMIT_OPTIONS = [10, 25, 50, 100];

// ─── Active filter pill ───────────────────────────────────────────────────────

function ActivePill({ label, color, onRemove }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-md border ${color} whitespace-nowrap`}>
      {label}
      <button onClick={onRemove} className="text-current/60 hover:text-current transition-colors leading-none">✕</button>
    </span>
  );
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-zinc-800/60 animate-pulse">
      <div className="w-5 h-3 bg-zinc-800 rounded" />
      <div className="w-8 h-8 rounded-full bg-zinc-800 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 bg-zinc-800 rounded w-40" />
        <div className="h-2 bg-zinc-800/60 rounded w-64" />
      </div>
      <div className="flex gap-1">
        <div className="h-5 w-16 bg-zinc-800 rounded" />
        <div className="h-5 w-16 bg-zinc-800 rounded" />
      </div>
      <div className="h-1 w-16 bg-zinc-800 rounded-full hidden md:block" />
    </div>
  );
}

// ─── JD Panel ────────────────────────────────────────────────────────────────

function JDPanel({ value, onChange, onSearch, loading, interpretation, onClear, onHide }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden border-t border-zinc-800/60"
    >
      <div className="px-4 py-3 space-y-3">
        {/* Label */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-semibold flex items-center gap-1.5">
            <Sparkle size={10} className="text-cyan-500" />
            JD / Skill Query — AI will extract skills & domains from this text
          </span>
          <div className="flex items-center gap-3">
            {value && (
              <button onClick={onClear} className="text-[10px] text-zinc-600 hover:text-zinc-400 flex items-center gap-1 transition-colors">
                <X size={10} /> Clear JD
              </button>
            )}
            <button
              onClick={onHide}
              className="text-[10px] text-zinc-500 hover:text-zinc-200 border border-zinc-700/60 hover:border-zinc-600 bg-zinc-800/60 hover:bg-zinc-800 px-2.5 py-1 rounded-md flex items-center gap-1 transition-all"
            >
              Hide ↑
            </button>
          </div>
        </div>

        {/* Textarea */}
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={`Paste a job description, skill requirements, or free-text query…\n\ne.g. "Looking for a React developer with Node.js, PostgreSQL, and Docker experience for a backend-heavy role."`}
          rows={4}
          className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-cyan-500/40 transition-colors resize-none leading-relaxed"
        />

        {/* Search with JD button */}
        <div className="flex items-center gap-2">
          <button
            onClick={onSearch}
            disabled={!value.trim() || loading}
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors"
          >
            <Sparkle size={12} weight="bold" />
            {loading ? "Searching…" : "Search with JD"}
          </button>
          {interpretation && (
            <span className="text-[10px] text-zinc-600">
              Extracted: {interpretation.extractedSkills?.length || 0} skills · {interpretation.topDomains?.length || 0} domains
            </span>
          )}
        </div>

        {/* Interpretation chips */}
        {interpretation?.extractedSkills?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] text-zinc-700 self-center">Skills found:</span>
            {interpretation.extractedSkills.slice(0, 10).map(s => (
              <span key={s} className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">{s}</span>
            ))}
          </div>
        )}
        {interpretation?.topDomains?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] text-zinc-700 self-center">Domains:</span>
            {interpretation.topDomains.slice(0, 5).map(d => {
              const cfg = getDomainConfig(d);
              return (
                <span key={d} className={`text-[10px] px-2 py-0.5 rounded-md border ${cfg.tagBg} ${cfg.tagText} ${cfg.tagBorder}`}>
                  {cfg.label}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ExplorePage() {
  const navigate = useNavigate();

  // UI state
  const [filters,     setFilters]     = useState(EMPTY_FILTERS);
  const [nameQuery,   setNameQuery]   = useState("");
  const [jdQuery,     setJdQuery]     = useState("");
  const [jdOpen,      setJdOpen]      = useState(false);
  const [limit,       setLimit]       = useState(50);
  const [limitOpen,   setLimitOpen]   = useState(false);
  const [modalOpen,   setModalOpen]   = useState(false);

  // Results state
  const [results,      setResults]       = useState([]);
  const [total,        setTotal]         = useState(0);
  const [loading,      setLoading]       = useState(false);
  const [error,        setError]         = useState(null);
  const [interpretation, setInterpretation] = useState(null);
  const [jdActive,     setJdActive]      = useState(false); // true when results come from JD search

  const [needsToken, setNeedsToken] = useState(!localStorage.getItem("cc_token"));

  const filterBtnRef = useRef(null);
  const limitRef     = useRef(null);
  const searchRef    = useRef(null);

  const activeCount =
    filters.domains.length + filters.skills.length + filters.years.length +
    filters.branches.length + (filters.activity ? 1 : 0);

  // ── Regular fetch (no JD) ─────────────────────────────────────────────────

  const fetchResults = useCallback(async (f, lim) => {
    setLoading(true); setError(null); setJdActive(false); setInterpretation(null);
    try {
      const data = await searchApi.search({ ...f, limit: lim || limit });
      setResults(data.results || []);
      setTotal(data.total || 0);
    } catch (err) {
      if (err.status === 401) { localStorage.removeItem("cc_token"); setNeedsToken(true); }
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  // ── JD unified fetch ───────────────────────────────────────────────────────

  async function fetchWithJD() {
    if (!jdQuery.trim()) return;
    setLoading(true); setError(null);
    try {
      const data = await searchApi.unified({
        query:    jdQuery.trim(),
        domains:  filters.domains,
        skills:   filters.skills,
        year:     filters.years,
        branch:   filters.branches,
        activity: filters.activity,
        limit,
      });
      setResults(data.results || []);
      setTotal(data.total || 0);
      setInterpretation(data.queryInterpretation || null);
      setJdActive(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function clearJD() {
    setJdQuery("");
    setJdActive(false);
    setInterpretation(null);
    fetchResults(filters, limit);
  }

  // Debounced re-fetch when filters or limit change (only if no JD active)
  useEffect(() => {
    if (jdActive) return;
    const t = setTimeout(() => fetchResults(filters, limit), 200);
    return () => clearTimeout(t);
  }, [filters, limit, fetchResults, jdActive]);

  // Close limit dropdown on outside click
  useEffect(() => {
    function handle(e) {
      if (limitRef.current && !limitRef.current.contains(e.target)) setLimitOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // ── Name filter (client-side) ─────────────────────────────────────────────

  const displayed = nameQuery.trim()
    ? results.filter(u =>
        u.name?.toLowerCase().includes(nameQuery.toLowerCase()) ||
        u.githubUsername?.toLowerCase().includes(nameQuery.toLowerCase())
      )
    : results;

  // ── Token gate ────────────────────────────────────────────────────────────

  if (needsToken) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4">Authentication required</p>
          <input
            type="text"
            placeholder="Paste your JWT token"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 font-mono mb-3"
            onKeyDown={e => {
              if (e.key === "Enter" && e.target.value.trim()) {
                localStorage.setItem("cc_token", e.target.value.trim());
                setNeedsToken(false);
              }
            }}
          />
        </div>
      </div>
    );
  }

  // ── Filter helpers ────────────────────────────────────────────────────────

  function removeFilter(key, id) {
    setFilters(f => ({
      ...f,
      [key]: Array.isArray(f[key]) ? f[key].filter(x => x !== id) : null,
    }));
  }

  function activePills() {
    const pills = [];
    for (const d of filters.domains) {
      const cfg = getDomainConfig(d);
      pills.push(
        <ActivePill key={`d-${d}`} label={cfg.label}
          color={`${cfg.tagBg} ${cfg.tagText} ${cfg.tagBorder}`}
          onRemove={() => removeFilter("domains", d)} />
      );
    }
    for (const s of filters.skills) {
      pills.push(
        <ActivePill key={`s-${s}`} label={s}
          color="bg-zinc-800 text-zinc-400 border-zinc-700"
          onRemove={() => removeFilter("skills", s)} />
      );
    }
    for (const y of filters.years) {
      pills.push(
        <ActivePill key={`y-${y}`} label={`Year ${y}`}
          color="bg-zinc-800 text-zinc-400 border-zinc-700"
          onRemove={() => removeFilter("years", y)} />
      );
    }
    for (const b of filters.branches) {
      pills.push(
        <ActivePill key={`b-${b}`} label={b}
          color="bg-zinc-800 text-zinc-400 border-zinc-700"
          onRemove={() => removeFilter("branches", b)} />
      );
    }
    if (filters.activity) {
      pills.push(
        <ActivePill key="act" label={`${filters.activity.charAt(0).toUpperCase() + filters.activity.slice(1)} activity`}
          color="bg-zinc-800 text-zinc-400 border-zinc-700"
          onRemove={() => setFilters(f => ({ ...f, activity: null }))} />
      );
    }
    return pills;
  }

  const pills = activePills();

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-zinc-800/60 bg-zinc-950/95 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">

          {/* Row 1: brand / search / JD toggle / limit / filter */}
          <div className="flex items-center gap-2 py-2.5">
            {/* Brand */}
            <button
              onClick={() => navigate("/")}
              className="text-xs text-zinc-500 font-mono shrink-0 hover:text-zinc-300 transition-colors"
            >
              CampusConnect
            </button>
            <span className="text-zinc-800">/</span>

            {/* Name search */}
            <div className="flex-1 relative min-w-0">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchRef}
                value={nameQuery}
                onChange={e => setNameQuery(e.target.value)}
                placeholder="Search by name or @username"
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg pl-8 pr-7 py-1.5 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
              />
              {nameQuery && (
                <button onClick={() => setNameQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 text-xs">✕</button>
              )}
            </div>

            {/* JD toggle button */}
            <button
              onClick={() => setJdOpen(v => !v)}
              className={`shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
                jdOpen || jdActive
                  ? "bg-cyan-600/20 text-cyan-400 border-cyan-500/40"
                  : "bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-600 hover:text-zinc-300"
              }`}
            >
              <FileText size={13} weight={jdOpen ? "fill" : "regular"} />
              <span className="hidden sm:inline">JD Query</span>
              {jdActive && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
            </button>

            {/* Limit selector */}
            <div ref={limitRef} className="relative shrink-0">
              <button
                onClick={() => setLimitOpen(v => !v)}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-600 hover:text-zinc-300 transition-all"
              >
                {limit}
                <CaretDown size={10} className={`transition-transform ${limitOpen ? "rotate-180" : ""}`} />
              </button>
              {limitOpen && (
                <div className="absolute right-0 top-full mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl overflow-hidden z-50">
                  {LIMIT_OPTIONS.map(n => (
                    <button
                      key={n}
                      onClick={() => { setLimit(n); setLimitOpen(false); if (jdActive) fetchWithJD(); }}
                      className={`block w-full text-left px-4 py-1.5 text-xs transition-colors ${
                        limit === n
                          ? "bg-zinc-800 text-zinc-200"
                          : "text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300"
                      }`}
                    >
                      {n} results
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Filter button */}
            <div className="relative shrink-0">
              <button
                ref={filterBtnRef}
                onClick={() => setModalOpen(v => !v)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  modalOpen || activeCount > 0
                    ? "bg-zinc-800 text-zinc-200 border-zinc-600"
                    : "bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-600 hover:text-zinc-300"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M7 8h10M11 12h2" />
                </svg>
                Filter
                {activeCount > 0 && (
                  <span className="bg-sky-500 text-white text-[10px] font-medium w-4 h-4 rounded-full flex items-center justify-center tabular-nums">
                    {activeCount}
                  </span>
                )}
              </button>

              {modalOpen && (
                <FilterModal
                  filters={filters}
                  onChange={setFilters}
                  onReset={() => setFilters(EMPTY_FILTERS)}
                  onClose={() => setModalOpen(false)}
                  anchorRef={filterBtnRef}
                />
              )}
            </div>
          </div>

          {/* Row 2: JD panel (collapsible) */}
          <AnimatePresence>
            {jdOpen && (
              <JDPanel
                value={jdQuery}
                onChange={setJdQuery}
                onSearch={fetchWithJD}
                loading={loading}
                interpretation={interpretation}
                onClear={clearJD}
                onHide={() => setJdOpen(false)}
              />
            )}
          </AnimatePresence>

          {/* Row 3: active pills + result count */}
          {(pills.length > 0 || !loading) && (
            <div className="flex items-center gap-2 py-1.5 min-h-[28px]">
              <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
                {/* JD active indicator */}
                {jdActive && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-md border bg-cyan-500/10 text-cyan-400 border-cyan-500/20 whitespace-nowrap">
                    <Sparkle size={9} weight="fill" /> JD search active
                    <button onClick={clearJD} className="text-cyan-400/60 hover:text-cyan-400 transition-colors leading-none">✕</button>
                  </span>
                )}
                {pills}
                {(pills.length > 0 || jdActive) && (
                  <button
                    onClick={() => { setFilters(EMPTY_FILTERS); clearJD(); }}
                    className="text-[11px] text-zinc-700 hover:text-zinc-400 transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-zinc-600 shrink-0">
                {loading ? (
                  <span>Searching…</span>
                ) : (
                  <>
                    <span className="text-zinc-400 font-medium tabular-nums">{displayed.length}</span>
                    {" "}developer{displayed.length !== 1 ? "s" : ""} found
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Results ───────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto w-full flex-1 px-0 sm:px-6 pb-16">

        {/* Column header */}
        <div className="hidden sm:flex items-center gap-4 px-4 py-2 border-b border-zinc-800/40">
          <span className="w-5 shrink-0" />
          <span className="w-8 shrink-0" />
          <span className="flex-1 text-[10px] uppercase tracking-widest text-zinc-700">Developer</span>
          <span className="hidden sm:block text-[10px] uppercase tracking-widest text-zinc-700 w-[160px]">Domains</span>
          <span className="hidden md:block text-[10px] uppercase tracking-widest text-zinc-700 w-[160px]">Skills</span>
          <span className="text-[10px] uppercase tracking-widest text-zinc-700 w-20">Activity</span>
          <span className="w-3.5" />
        </div>

        {error && (
          <div className="px-4 py-8 text-center">
            <p className="text-zinc-500 text-sm">Search failed</p>
            <p className="text-zinc-700 text-xs font-mono mt-1">{error}</p>
          </div>
        )}

        {loading && !error && (
          Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
        )}

        {!loading && !error && displayed.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-zinc-500 text-sm">No developers match these filters</p>
            <button
              onClick={() => { setFilters(EMPTY_FILTERS); clearJD(); setNameQuery(""); }}
              className="mt-3 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Clear all filters
            </button>
          </div>
        )}

        {!loading && !error && displayed.map((user, i) => (
          <DeveloperCard
            key={user._id}
            user={user}
            index={i}
            highlight={filters.skills}
          />
        ))}
      </div>
    </div>
  );
}
