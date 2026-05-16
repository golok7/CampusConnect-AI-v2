import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { searchApi } from "../services/api.js";
import { getDomainConfig } from "../constants/domains.js";
import FilterModal from "../components/explore/FilterModal.jsx";
import DeveloperCard from "../components/explore/DeveloperCard.jsx";

// ── Defaults ──────────────────────────────────────────────────────────────────

const EMPTY_FILTERS = {
  domains:  [],
  skills:   [],
  years:    [],
  branches: [],
  activity: null,
};

// ── Active filter pill ────────────────────────────────────────────────────────

function ActivePill({ label, color, onRemove }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-md border ${color} whitespace-nowrap`}
    >
      {label}
      <button
        onClick={onRemove}
        className="text-current/60 hover:text-current transition-colors leading-none"
      >
        ✕
      </button>
    </span>
  );
}

// ── Toolbar ───────────────────────────────────────────────────────────────────

function Toolbar({ total, loading, onJump }) {
  return (
    <div className="flex items-center gap-2 text-xs text-zinc-600">
      {loading ? (
        <span>Searching…</span>
      ) : (
        <span>
          <span className="text-zinc-400 font-medium tabular-nums">{total}</span>
          {" "}developer{total !== 1 ? "s" : ""} found
        </span>
      )}
    </div>
  );
}

// ── Skeleton row ──────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-zinc-800/60 animate-pulse">
      <div className="w-5 h-3 bg-zinc-800 rounded" />
      <div className="w-8 h-8 rounded-full bg-zinc-800 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 bg-zinc-800 rounded w-40" />
        <div className="h-2 bg-zinc-800/60 rounded w-64" />
      </div>
      <div className="flex gap-1 hidden sm:flex">
        <div className="h-5 w-16 bg-zinc-800 rounded" />
        <div className="h-5 w-16 bg-zinc-800 rounded" />
      </div>
      <div className="h-1 w-16 bg-zinc-800 rounded-full hidden md:block" />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ExplorePage() {
  const navigate = useNavigate();
  const [filters,      setFilters]      = useState(EMPTY_FILTERS);
  const [nameQuery,    setNameQuery]     = useState("");
  const [results,      setResults]       = useState([]);
  const [total,        setTotal]         = useState(0);
  const [loading,      setLoading]       = useState(false);
  const [error,        setError]         = useState(null);
  const [modalOpen,    setModalOpen]     = useState(false);
  const [needsToken,   setNeedsToken]    = useState(!localStorage.getItem("cc_token"));

  const filterBtnRef = useRef(null);
  const searchRef    = useRef(null);

  // Active filter count
  const activeCount =
    filters.domains.length + filters.skills.length + filters.years.length +
    filters.branches.length + (filters.activity ? 1 : 0);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchResults = useCallback(async (f) => {
    setLoading(true);
    setError(null);
    try {
      const data = await searchApi.search({ ...f, limit: 50 });
      setResults(data.results || []);
      setTotal(data.total || 0);
    } catch (err) {
      if (err.status === 401) {
        localStorage.removeItem("cc_token");
        setNeedsToken(true);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced re-fetch on filter change
  useEffect(() => {
    const t = setTimeout(() => fetchResults(filters), 180);
    return () => clearTimeout(t);
  }, [filters, fetchResults]);

  // ── Name filter (client-side) ──────────────────────────────────────────────

  const displayed = nameQuery.trim()
    ? results.filter(u =>
        u.name?.toLowerCase().includes(nameQuery.toLowerCase()) ||
        u.githubUsername?.toLowerCase().includes(nameQuery.toLowerCase())
      )
    : results;

  // ── Token gate ─────────────────────────────────────────────────────────────

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
          <p className="text-[11px] text-zinc-700">Press Enter to continue</p>
        </div>
      </div>
    );
  }

  // ── Remove a single filter ─────────────────────────────────────────────────

  function removeFilter(key, id) {
    setFilters(f => ({
      ...f,
      [key]: Array.isArray(f[key]) ? f[key].filter(x => x !== id) : null,
    }));
  }

  // ── Active pills ───────────────────────────────────────────────────────────

  function activePills() {
    const pills = [];
    for (const d of filters.domains) {
      const cfg = getDomainConfig(d);
      pills.push(
        <ActivePill
          key={`d-${d}`}
          label={cfg.label}
          color={`${cfg.tagBg} ${cfg.tagText} ${cfg.tagBorder}`}
          onRemove={() => removeFilter("domains", d)}
        />
      );
    }
    for (const s of filters.skills) {
      pills.push(
        <ActivePill
          key={`s-${s}`}
          label={s}
          color="bg-zinc-800 text-zinc-400 border-zinc-700"
          onRemove={() => removeFilter("skills", s)}
        />
      );
    }
    for (const y of filters.years) {
      pills.push(
        <ActivePill
          key={`y-${y}`}
          label={`Year ${y}`}
          color="bg-zinc-800 text-zinc-400 border-zinc-700"
          onRemove={() => removeFilter("years", y)}
        />
      );
    }
    for (const b of filters.branches) {
      pills.push(
        <ActivePill
          key={`b-${b}`}
          label={b}
          color="bg-zinc-800 text-zinc-400 border-zinc-700"
          onRemove={() => removeFilter("branches", b)}
        />
      );
    }
    if (filters.activity) {
      pills.push(
        <ActivePill
          key="activity"
          label={`${filters.activity.charAt(0).toUpperCase() + filters.activity.slice(1)} activity`}
          color="bg-zinc-800 text-zinc-400 border-zinc-700"
          onRemove={() => setFilters(f => ({ ...f, activity: null }))}
        />
      );
    }
    return pills;
  }

  const pills = activePills();

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 border-b border-zinc-800/60 bg-zinc-950/90 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2.5">
          {/* Row 1: brand + search + filter btn */}
          <div className="flex items-center gap-3">
            {/* Brand */}
            <button
              onClick={() => navigate("/")}
              className="text-xs text-zinc-500 font-mono shrink-0 hover:text-zinc-300 transition-colors"
            >
              CampusConnect
            </button>

            <span className="text-zinc-800">/</span>

            {/* Name search */}
            <div className="flex-1 relative">
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchRef}
                value={nameQuery}
                onChange={e => setNameQuery(e.target.value)}
                placeholder="Search by name or @username"
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
              />
              {nameQuery && (
                <button
                  onClick={() => setNameQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 text-xs"
                >✕</button>
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

              {/* Filter modal */}
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

          {/* Row 2: active filter pills + result count */}
          {(pills.length > 0 || !loading) && (
            <div className="flex items-center gap-2 mt-2 min-h-[24px]">
              <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
                {pills}
                {pills.length > 0 && (
                  <button
                    onClick={() => setFilters(EMPTY_FILTERS)}
                    className="text-[11px] text-zinc-700 hover:text-zinc-400 transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <Toolbar total={displayed.length} loading={loading} />
            </div>
          )}
        </div>
      </div>

      {/* ── Results ──────────────────────────────────────────────────────── */}
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
          <>
            {Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)}
          </>
        )}

        {!loading && !error && displayed.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-zinc-500 text-sm">No developers match these filters</p>
            <button
              onClick={() => { setFilters(EMPTY_FILTERS); setNameQuery(""); }}
              className="mt-3 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Clear filters
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
