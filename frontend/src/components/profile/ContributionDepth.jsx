import { motion } from "framer-motion";
import { memo } from "react";

function Stat({ value, label }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-sm font-medium text-zinc-400 tabular-nums">
        {typeof value === "number" ? value.toLocaleString() : value}
      </span>
      <span className="text-xs text-zinc-700">{label}</span>
    </div>
  );
}

export default memo(function ContributionDepth({ contributionStats }) {
  if (!contributionStats) return null;

  const {
    totalRepos,
    totalCommits,
    totalStars,
    activityScore,
    repoTypeCounts = {},
  } = contributionStats;

  const projectRepos = repoTypeCounts.project || 0;
  const forkRepos = repoTypeCounts.fork || 0;

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="border-t border-zinc-800/60 pt-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-medium">
          Contribution Depth
        </p>
        <div className="flex-1 h-px bg-zinc-800/60" />
      </div>

      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
        <Stat value={totalRepos} label="repositories" />
        <Stat value={totalCommits} label="commits" />
        <Stat value={totalStars} label="stars" />
        <Stat value={Math.round(activityScore * 10) / 10} label="activity score" />

        {projectRepos > 0 && (
          <>
            <div className="w-px h-4 bg-zinc-800 hidden sm:block" />
            <Stat value={projectRepos} label="original projects" />
            {forkRepos > 0 && <Stat value={forkRepos} label="contributions" />}
          </>
        )}
      </div>
    </motion.section>
  );
});
