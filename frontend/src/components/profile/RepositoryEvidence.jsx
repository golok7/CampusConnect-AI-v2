import { motion } from "framer-motion";
import { memo } from "react";
import { getDomainConfig } from "../../constants/domains.js";

function RepoCard({ repo, index }) {
  const cfg = getDomainConfig(repo.dominantDomain);
  const displayName = repo.name.length > 36 ? repo.name.slice(0, 34) + "…" : repo.name;

  return (
    <motion.a
      href={repo.url || `https://github.com/search?q=${encodeURIComponent(repo.name)}&type=repositories`}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, x: 4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.2 + index * 0.05 }}
      className="group flex items-start gap-3 p-3 rounded-lg border border-zinc-800 bg-zinc-900/20 hover:bg-zinc-900/60 hover:border-zinc-700/80 transition-all"
    >
      {/* Domain accent bar */}
      <div className={`w-0.5 self-stretch rounded-full ${cfg.dotColor} shrink-0 opacity-70`} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-mono text-zinc-300 group-hover:text-zinc-100 transition-colors truncate">
            {displayName}
          </span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${cfg.tagBg} ${cfg.tagText} ${cfg.tagBorder}`}
          >
            {cfg.label}
          </span>
        </div>

        {repo.description && (
          <p className="text-[11px] text-zinc-600 mt-1.5 leading-relaxed line-clamp-2 group-hover:text-zinc-500 transition-colors">
            {repo.description}
          </p>
        )}
      </div>
    </motion.a>
  );
}

export default memo(function RepositoryEvidence({ topRepos = [] }) {
  if (!topRepos.length) return null;

  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-medium">
          Projects
        </p>
        <div className="flex-1 h-px bg-zinc-800/60" />
      </div>

      <div className="space-y-1.5">
        {topRepos.map((repo, i) => (
          <RepoCard key={repo.name} repo={repo} index={i} />
        ))}
      </div>
    </section>
  );
});
