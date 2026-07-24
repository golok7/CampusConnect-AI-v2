import { useState } from "react";
import { memo } from "react";
import { motion } from "framer-motion";
import { getDomainConfig } from "../../constants/domains.js";
import { resumeApi } from "../../services/api.js";

function DomainTag({ domain }) {
  const cfg = getDomainConfig(domain);
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border ${cfg.tagBg} ${cfg.tagText} ${cfg.tagBorder}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor} flex-shrink-0`} />
      {cfg.label}
    </span>
  );
}

function Signal({ value, label }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-xs font-medium text-zinc-300 tabular-nums">{value.toLocaleString()}</span>
      <span className="text-[11px] text-zinc-600">{label}</span>
    </div>
  );
}

function DownloadResumeButton({ githubUsername }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleDownload() {
    setLoading(true);
    setError(null);
    try {
      await resumeApi.download(githubUsername);
    } catch {
      setError("Unavailable");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      title="Download resume"
      className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-600 px-2.5 py-1 rounded-md transition-colors disabled:opacity-50"
    >
      {loading ? (
        <span className="w-3 h-3 rounded-full border border-zinc-600 border-t-zinc-300 animate-spin" />
      ) : (
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 1v7M3 6l3 3 3-3M1 10h10" />
        </svg>
      )}
      {error ? error : "Resume"}
    </button>
  );
}

export default memo(function ProfileHero({ profile }) {
  const {
    name,
    githubUsername,
    branch,
    year,
    role,
    profileSummary,
    topDomains = [],
    contributionStats,
    skillEvidence,
    hasResume,
  } = profile;

  const topFour   = topDomains.slice(0, 4);
  const strongest = skillEvidence?.strongest?.slice(0, 6) ?? [];

  return (
    <div className="relative border-b border-zinc-800/60">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative max-w-5xl mx-auto px-4 sm:px-6 py-8"
      >
        <div className="flex flex-col sm:flex-row items-start gap-5">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <img
              src={`https://github.com/${githubUsername}.png?size=128`}
              alt={name}
              className="w-[72px] h-[72px] rounded-full ring-1 ring-zinc-700/80 bg-zinc-800"
              onError={(e) => { e.target.style.display = "none"; }}
            />
          </div>

          {/* Identity block */}
          <div className="flex-1 min-w-0">
            {/* Name row */}
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h1 className="text-xl font-semibold text-zinc-50 tracking-tight leading-tight">
                  {name}
                </h1>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                  <a
                    href={`https://github.com/${githubUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-zinc-500 font-mono hover:text-zinc-400 transition-colors"
                  >
                    @{githubUsername}
                  </a>
                  {hasResume && (
                    <DownloadResumeButton githubUsername={githubUsername} />
                  )}
                  {branch && (
                    <>
                      <span className="text-zinc-700">·</span>
                      <span className="text-xs text-zinc-500">{branch}</span>
                    </>
                  )}
                  {year && (
                    <>
                      <span className="text-zinc-700">·</span>
                      <span className="text-xs text-zinc-500">Year {year}</span>
                    </>
                  )}
                </div>
              </div>
              {role && (
                <span className="text-[11px] text-zinc-600 border border-zinc-800 px-2 py-0.5 rounded capitalize flex-shrink-0">
                  {role}
                </span>
              )}
            </div>

            {/* Semantic summary */}
            {profileSummary && (
              <p className="mt-2.5 text-sm text-zinc-400 leading-relaxed max-w-2xl">
                {profileSummary}
              </p>
            )}

            {/* Domain tags */}
            {topFour.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {topFour.map((d) => (
                  <DomainTag key={d.domain} domain={d.domain} />
                ))}
              </div>
            )}

            {/* Strongest skills — inline as text */}
            {strongest.length > 0 && (
              <p className="mt-2.5 text-xs text-zinc-600">
                {strongest.map((s, i) => (
                  <span key={s}>
                    <span className="text-zinc-400 capitalize">{s}</span>
                    {i < strongest.length - 1 && (
                      <span className="mx-1.5 text-zinc-700">·</span>
                    )}
                  </span>
                ))}
              </p>
            )}

            {/* Contribution signals */}
            {contributionStats && (
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3 pt-3 border-t border-zinc-800/60">
                <Signal value={contributionStats.totalRepos} label="repos" />
                <Signal value={contributionStats.totalCommits} label="commits" />
                <Signal value={contributionStats.totalStars} label="stars" />
                <Signal value={Math.round(contributionStats.activityScore)} label="activity" />
                {contributionStats.repoTypeCounts?.project > 0 && (
                  <Signal value={contributionStats.repoTypeCounts.project} label="original" />
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
});
