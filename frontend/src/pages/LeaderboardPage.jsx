import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { leaderboardApi } from "../services/api.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { Trophy, Star } from "@phosphor-icons/react";

function Skeleton({ className }) {
  return <div className={`animate-pulse bg-zinc-800/60 rounded-md ${className}`} />;
}

const MEDAL = ["#f59e0b", "#9ca3af", "#c2914a"];

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    leaderboardApi.get()
      .then(data => setEntries(data?.leaderboard || data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const myRank = entries.findIndex(e => e._id === user?.id);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Leaderboard</h1>
          <p className="text-sm text-zinc-500 mt-1">Ranked by activity score across GitHub, skills, and contributions</p>
        </div>
        {myRank !== -1 && (
          <div className="text-right">
            <p className="text-xs text-zinc-600">Your rank</p>
            <p className="text-2xl font-semibold text-emerald-400 tabular-nums">#{myRank + 1}</p>
          </div>
        )}
      </div>

      <div className="border border-zinc-800/60 rounded-xl overflow-hidden">
        {loading ? (
          <div className="divide-y divide-zinc-800/60">
            {[1,2,3,4,5,6,7,8].map(i => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="w-6 h-4" />
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-3 w-32 mb-1.5" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="p-10 text-center">
            <Trophy size={28} className="text-zinc-700 mx-auto mb-3" weight="duotone" />
            <p className="text-sm text-zinc-600">No entries yet</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {entries.map((entry, i) => {
              const isMe = entry._id === user?.id;
              return (
                <motion.div
                  key={entry._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className={`flex items-center gap-4 px-4 py-3 transition-colors ${
                    isMe ? "bg-emerald-500/5 border-l-2 border-emerald-500/50" : "bg-zinc-900/10 hover:bg-zinc-900/40"
                  }`}
                >
                  {/* Rank */}
                  <div className="w-6 text-center">
                    {i < 3 ? (
                      <Trophy size={15} style={{ color: MEDAL[i] }} weight="fill" />
                    ) : (
                      <span className="text-xs text-zinc-600 tabular-nums font-mono">{i + 1}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <img
                    src={entry.githubUsername
                      ? `https://github.com/${entry.githubUsername}.png?size=40`
                      : `https://api.dicebear.com/7.x/initials/svg?seed=${entry.name}`
                    }
                    alt=""
                    className="w-8 h-8 rounded-full bg-zinc-800 shrink-0 object-cover"
                    onError={e => { e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${entry.name}`; }}
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-zinc-200 truncate">{entry.name}</p>
                      {isMe && <span className="text-[10px] text-emerald-400 border border-emerald-500/30 rounded px-1">you</span>}
                    </div>
                    <p className="text-xs text-zinc-600 truncate">
                      {[entry.githubUsername && `@${entry.githubUsername}`, entry.branch, entry.year && `Year ${entry.year}`]
                        .filter(Boolean).join(" · ")}
                    </p>
                  </div>

                  {/* Score */}
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-zinc-200 tabular-nums font-mono">
                      {entry.activityScore?.toFixed(1) ?? "—"}
                    </p>
                    {entry.topDomains?.[0] && (
                      <p className="text-[10px] text-zinc-600 capitalize">
                        {entry.topDomains[0].domain.replace(/_/g, " ")}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
