import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { analyticsApi } from "../services/api.js";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from "recharts";
import { ChartBar, Users, Trophy, Briefcase } from "@phosphor-icons/react";
import { motion } from "framer-motion";

function Skeleton({ className }) {
  return <div className={`animate-pulse bg-zinc-800/60 rounded-md ${className}`} />;
}

const CHART_THEME = {
  fill: "#10b981",
  fillAlt: "#0ea5e9",
  grid: "#27272a",
  text: "#71717a",
  tooltip: { bg: "#18181b", border: "#3f3f46", text: "#e4e4e7" },
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-zinc-400 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} className="text-zinc-200 font-mono">{p.name}: {p.value}</p>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const isRecruiter = user?.role === "recruiter";

  const [global,    setGlobal]    = useState(null);
  const [recruiter, setRecruiter] = useState(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [g, r] = await Promise.allSettled([
          analyticsApi.global(),
          isRecruiter ? analyticsApi.recruiter() : Promise.resolve(null),
        ]);
        if (g.status === "fulfilled") setGlobal(g.value);
        if (r.status === "fulfilled") setRecruiter(r.value);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isRecruiter]);

  const topSkills  = (global?.topSkills  || []).slice(0, 10);
  const topDomains = (global?.topDomains || []).slice(0, 8);
  const funnel     = recruiter?.funnel || {};

  const funnelData = Object.entries(funnel).map(([stage, count]) => ({ stage, count }));
  const radarData  = topDomains.map(d => ({ domain: d.domain.replace(/_/g," "), count: d.count }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Analytics</h1>
        <p className="text-sm text-zinc-500 mt-1">Platform-wide placement intelligence</p>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-zinc-800/60 rounded-xl overflow-hidden mb-8">
        {[
          { label: "Total Students", value: global?.totalStudents,    Icon: Users },
          { label: "Placed",         value: global?.placedCount,      Icon: Trophy },
          { label: "Avg Activity",   value: global?.avgActivityScore?.toFixed(1), Icon: ChartBar },
          { label: "Drives",         value: recruiter?.totalDrives,   Icon: Briefcase },
        ].map(({ label, value, Icon }) => (
          <div key={label} className="bg-zinc-950 px-5 py-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon size={13} className="text-zinc-600" weight="duotone" />
              <p className="text-xs text-zinc-500 uppercase tracking-widest">{label}</p>
            </div>
            <p className="text-2xl font-semibold text-zinc-100 tabular-nums">
              {loading ? <Skeleton className="w-14 h-7 inline-block" /> : (value ?? "—")}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top skills bar chart */}
        <section>
          <h2 className="text-xs text-zinc-500 uppercase tracking-widest mb-4">Top Skills</h2>
          <div className="border border-zinc-800/60 rounded-xl p-4 bg-zinc-900/20">
            {loading ? <Skeleton className="h-48 w-full" /> : topSkills.length === 0 ? (
              <p className="text-sm text-zinc-600 text-center py-10">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topSkills} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: CHART_THEME.text }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11, fill: CHART_THEME.text }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                  <Bar dataKey="count" fill={CHART_THEME.fill} radius={[0, 3, 3, 0]} maxBarSize={16} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* Domain radar */}
        <section>
          <h2 className="text-xs text-zinc-500 uppercase tracking-widest mb-4">Domain Distribution</h2>
          <div className="border border-zinc-800/60 rounded-xl p-4 bg-zinc-900/20">
            {loading ? <Skeleton className="h-48 w-full" /> : radarData.length === 0 ? (
              <p className="text-sm text-zinc-600 text-center py-10">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke={CHART_THEME.grid} />
                  <PolarAngleAxis dataKey="domain" tick={{ fontSize: 10, fill: CHART_THEME.text }} />
                  <Radar dataKey="count" stroke={CHART_THEME.fill} fill={CHART_THEME.fill} fillOpacity={0.15} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* Recruiter pipeline funnel */}
        {isRecruiter && (
          <section>
            <h2 className="text-xs text-zinc-500 uppercase tracking-widest mb-4">Hiring Funnel</h2>
            <div className="border border-zinc-800/60 rounded-xl p-4 bg-zinc-900/20">
              {loading ? <Skeleton className="h-48 w-full" /> : funnelData.length === 0 ? (
                <p className="text-sm text-zinc-600 text-center py-10">No pipeline data</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={funnelData} margin={{ left: 0, right: 0 }}>
                    <XAxis dataKey="stage" tick={{ fontSize: 11, fill: CHART_THEME.text }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: CHART_THEME.text }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                    <Bar dataKey="count" fill={CHART_THEME.fillAlt} radius={[3, 3, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>
        )}

        {/* Top domains table */}
        <section>
          <h2 className="text-xs text-zinc-500 uppercase tracking-widest mb-4">Domain Breakdown</h2>
          <div className="border border-zinc-800/60 rounded-xl overflow-hidden bg-zinc-900/20">
            {loading ? (
              <div className="divide-y divide-zinc-800/60">
                {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full m-2" />)}
              </div>
            ) : topDomains.length === 0 ? (
              <p className="text-sm text-zinc-600 text-center py-10">No data yet</p>
            ) : (
              <div className="divide-y divide-zinc-800/60">
                {topDomains.map(({ domain, count }, i) => {
                  const max = topDomains[0]?.count || 1;
                  return (
                    <motion.div
                      key={domain}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-3 px-4 py-2.5"
                    >
                      <span className="text-xs text-zinc-600 w-5 tabular-nums">{i + 1}</span>
                      <span className="text-sm text-zinc-300 capitalize flex-1">{domain.replace(/_/g, " ")}</span>
                      <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500/60 rounded-full" style={{ width: `${Math.round((count/max)*100)}%` }} />
                      </div>
                      <span className="text-xs text-zinc-500 w-6 text-right tabular-nums font-mono">{count}</span>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
