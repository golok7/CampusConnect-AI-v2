import { getDomainConfig, getRelevantSkills } from "../../constants/domains.js";
import { memo } from "react";

function RepoRow({ name, githubUsername }) {
  const url = githubUsername
    ? `https://github.com/${githubUsername}/${name}`
    : `https://github.com/search?q=${encodeURIComponent(name)}&type=repositories`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 group"
    >
      <span className="text-zinc-700 text-xs group-hover:text-zinc-500 transition-colors flex-shrink-0">→</span>
      <span className="text-xs text-zinc-400 font-mono truncate group-hover:text-zinc-300 transition-colors underline-offset-2 group-hover:underline">
        {name}
      </span>
    </a>
  );
}

export default memo(function DomainCard({ domain, topRepos = [], normalizedSkills = [], topDomainData, githubUsername }) {
  const cfg            = getDomainConfig(domain);
  const relevantSkills = getRelevantSkills(domain, normalizedSkills);
  const metrics        = topDomainData?.metrics;

  return (
    <div
      className={`relative flex flex-col h-full border border-zinc-800 border-l-2 ${cfg.borderL} rounded-xl p-4 bg-zinc-900/30 hover:bg-zinc-900/50 transition-colors`}
    >
      {/* Header */}
      <div className="mb-2.5">
        <h3 className={`text-sm font-semibold ${cfg.textColor}`}>{cfg.label}</h3>
      </div>

      {/* Description */}
      <p className="text-xs text-zinc-500 leading-relaxed mb-3">{cfg.description}</p>

      {/* Evidence repos */}
      <div className="flex-1 mb-3">
        <p className="text-[10px] text-zinc-700 uppercase tracking-widest mb-2">Evidence</p>
        <div className="space-y-1.5">
          {topRepos.length > 0 ? (
            topRepos.slice(0, 3).map((repo) => <RepoRow key={repo} name={repo} githubUsername={githubUsername} />)
          ) : (
            <span className="text-xs text-zinc-700 italic">No direct evidence</span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-800/50 pt-2.5 flex items-end justify-between gap-2">
        {relevantSkills.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {relevantSkills.map((skill) => (
              <span
                key={skill}
                className="text-[10px] text-zinc-500 bg-zinc-800/60 border border-zinc-800 px-1.5 py-0.5 rounded capitalize"
              >
                {skill}
              </span>
            ))}
          </div>
        )}

        {metrics && (
          <span className="text-[10px] text-zinc-700 shrink-0 whitespace-nowrap">
            {metrics.repos}r · {metrics.commits}c{metrics.stars > 0 ? ` · ${metrics.stars}★` : ""}
          </span>
        )}
      </div>
    </div>
  );
});
