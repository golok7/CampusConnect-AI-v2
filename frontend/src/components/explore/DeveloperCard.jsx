import { useNavigate } from "react-router-dom";
import { getDomainConfig } from "../../constants/domains.js";

function DomainPill({ domain }) {
  const cfg = getDomainConfig(domain);
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${cfg.tagBg} ${cfg.tagText} ${cfg.tagBorder}`}>
      <span className={`w-1 h-1 rounded-full ${cfg.dotColor} flex-shrink-0`} />
      {cfg.label}
    </span>
  );
}

function SkillPill({ skill }) {
  return (
    <span className="text-[10px] text-zinc-500 bg-zinc-800/70 border border-zinc-800 px-1.5 py-0.5 rounded capitalize">
      {skill}
    </span>
  );
}

function ActivityBar({ score }) {
  const pct = Math.min((Math.log(score + 1) / 6) * 100, 100);
  const color =
    score >= 200 ? "bg-emerald-500" :
    score >= 80  ? "bg-amber-500"   : "bg-zinc-600";
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-zinc-600 tabular-nums">{Math.round(score)}</span>
    </div>
  );
}

export default function DeveloperCard({ user, index, highlight = [] }) {
  const navigate = useNavigate();

  const topDomains = (user.topDomains || [])
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 3)
    .map(d => d.domain);

  const topSkills = (user.whyMatched?.matchedSkills || []).slice(0, 4);

  const highlightSet = new Set(highlight.map(s => s.toLowerCase()));

  return (
    <div
      onClick={() => navigate(`/profile/${user.githubUsername}`)}
      className="group flex items-center gap-4 px-4 py-3 border-b border-zinc-800/60
                 hover:bg-zinc-900/60 cursor-pointer transition-colors"
    >
      {/* Index */}
      <span className="text-[11px] text-zinc-700 w-5 shrink-0 tabular-nums text-right">
        {index + 1}
      </span>

      {/* Avatar */}
      <img
        src={`https://github.com/${user.githubUsername}.png?size=64`}
        alt={user.name}
        className="w-8 h-8 rounded-full bg-zinc-800 ring-1 ring-zinc-700/60 shrink-0"
        onError={e => { e.target.style.display = "none"; }}
      />

      {/* Identity */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-sm font-medium text-zinc-200 group-hover:text-zinc-100 truncate transition-colors">
            {user.name}
          </span>
          <span className="text-[11px] text-zinc-600 font-mono shrink-0">@{user.githubUsername}</span>
          {user.branch && (
            <span className="text-[10px] text-zinc-700 shrink-0">{user.branch} Y{user.year}</span>
          )}
        </div>

        {/* Semantic summary */}
        {user.whyMatched?.semanticSummary && (
          <p className="text-[11px] text-zinc-600 mt-0.5 truncate">
            {user.whyMatched.semanticSummary}
          </p>
        )}
      </div>

      {/* Domain pills */}
      <div className="hidden sm:flex items-center gap-1 shrink-0">
        {topDomains.map(d => <DomainPill key={d} domain={d} />)}
      </div>

      {/* Skill pills */}
      <div className="hidden md:flex items-center gap-1 shrink-0 max-w-[160px] flex-wrap">
        {topSkills.map(s => (
          <SkillPill
            key={s}
            skill={s}
            highlighted={highlightSet.has(s.toLowerCase())}
          />
        ))}
      </div>

      {/* Activity */}
      <div className="shrink-0">
        <ActivityBar score={user.activityScore || 0} />
      </div>

      {/* Arrow */}
      <svg
        className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-500 shrink-0 transition-colors"
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </div>
  );
}
