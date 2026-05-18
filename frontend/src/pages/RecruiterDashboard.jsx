import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { drivesApi, analyticsApi } from "../services/api.js";
import { Plus, Briefcase, Users, TrendUp, ArrowRight, Circle } from "@phosphor-icons/react";

const STAGE_COLORS = {
  shortlisted: "text-sky-400",
  interviewing: "text-amber-400",
  offered: "text-emerald-400",
  rejected: "text-rose-400",
};

function Skeleton({ className }) {
  return <div className={`animate-pulse bg-zinc-800/60 rounded-md ${className}`} />;
}

function FunnelBar({ label, count, max }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-zinc-500 w-24 capitalize">{label}</span>
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500/60 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-zinc-500 w-6 text-right tabular-nums">{count}</span>
    </div>
  );
}

export default function RecruiterDashboard() {
  const navigate = useNavigate();
  const [drives,    setDrives]    = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading,   setLoading]   = useState(true);

  // Create drive modal state
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm]   = useState({
    title: "", company: "", type: "placement", description: "",
    deadline: "", requiredSkills: "",
    eligDepts: "", eligMinYear: "", eligMaxYear: "",
  });
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [d, a] = await Promise.allSettled([drivesApi.list(), analyticsApi.recruiter()]);
        if (d.status === "fulfilled") setDrives(d.value || []);
        if (a.status === "fulfilled") setAnalytics(a.value);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function createDrive(e) {
    e.preventDefault();
    setCreateErr(""); setCreating(true);
    try {
      const payload = {
        title: form.title,
        company: form.company,
        type: form.type,
        description: form.description,
        deadline: form.deadline || null,
        requiredSkills: form.requiredSkills
          ? form.requiredSkills.split(",").map(s => s.trim()).filter(Boolean)
          : [],
        eligibility: {
          departments: form.eligDepts
            ? form.eligDepts.split(",").map(s => s.trim()).filter(Boolean)
            : [],
          minYear: form.eligMinYear ? parseInt(form.eligMinYear) : null,
          maxYear: form.eligMaxYear ? parseInt(form.eligMaxYear) : null,
        },
      };
      const d = await drivesApi.create(payload);
      setDrives(prev => [d.drive, ...prev]);
      setShowCreate(false);
      setForm({ title: "", company: "", type: "placement", description: "", deadline: "", requiredSkills: "", eligDepts: "", eligMinYear: "", eligMaxYear: "" });
    } catch (err) {
      setCreateErr(err.message || "Failed to create drive");
    } finally {
      setCreating(false);
    }
  }

  const funnel = analytics?.funnel || {};
  const funnelMax = Math.max(...Object.values(funnel));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Recruiter Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage drives, search candidates, track pipeline</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors active:scale-[0.98] shrink-0"
        >
          <Plus size={15} />
          New Drive
        </button>
      </div>

      {/* Analytics strip */}
      <div className="grid grid-cols-3 gap-px bg-zinc-800/60 rounded-xl overflow-hidden mb-8">
        {[
          { label: "Total Drives",     value: analytics?.totalDrives     ?? "—" },
          { label: "Total Candidates", value: analytics?.totalCandidates ?? "—" },
          { label: "Offers Extended",  value: funnel.offered             ?? "—" },
        ].map(({ label, value }) => (
          <div key={label} className="bg-zinc-950 px-6 py-4">
            <p className="text-xs text-zinc-500 uppercase tracking-widest">{label}</p>
            <p className="text-2xl font-semibold text-zinc-100 mt-1 tabular-nums">
              {loading ? <Skeleton className="w-12 h-7 inline-block" /> : value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">

        {/* Drives list */}
        <section>
          <h2 className="text-xs text-zinc-500 uppercase tracking-widest mb-4">Placement Drives</h2>
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
          ) : drives.length === 0 ? (
            <div className="border border-dashed border-zinc-800 rounded-xl p-10 text-center">
              <Briefcase size={28} className="text-zinc-700 mx-auto mb-3" weight="duotone" />
              <p className="text-sm text-zinc-600">No drives yet</p>
              <button
                onClick={() => setShowCreate(true)}
                className="mt-3 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Create your first drive
              </button>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60 border border-zinc-800/60 rounded-xl overflow-hidden">
              {drives.map((d, i) => (
                <motion.div
                  key={d._id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="px-4 py-3 bg-zinc-900/20 hover:bg-zinc-900/50 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-zinc-200 truncate">{d.title}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md border capitalize ${
                          d.status === "active"
                            ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                            : "border-zinc-700 text-zinc-500"
                        }`}>
                          {d.status}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">{d.company} · {d.type}</p>
                      <div className="flex items-center gap-3 mt-2">
                        {Object.entries(d.candidateCounts || {}).map(([stage, count]) => (
                          count > 0 && (
                            <span key={stage} className={`text-[11px] ${STAGE_COLORS[stage] || "text-zinc-500"}`}>
                              {count} {stage}
                            </span>
                          )
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        to={`/recommend/candidates/${d._id}`}
                        className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors"
                      >
                        Rank candidates
                      </Link>
                      <Link
                        to={`/drives/${d._id}`}
                        className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
                      >
                        View <ArrowRight size={11} />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Right: funnel + quick links */}
        <div className="space-y-6">
          <section className="border border-zinc-800/60 rounded-xl px-5 py-4">
            <h2 className="text-xs text-zinc-500 uppercase tracking-widest mb-4">Pipeline Funnel</h2>
            {loading ? (
              <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-4 w-full" />)}</div>
            ) : (
              <div className="space-y-2.5">
                {["shortlisted","interviewing","offered","rejected"].map(s => (
                  <FunnelBar key={s} label={s} count={funnel[s] || 0} max={funnelMax} />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Quick actions</h2>
            <div className="space-y-2">
              {[
                { to: "/explore",   label: "Search candidates", Icon: Users },
                { to: "/analytics", label: "Analytics report",  Icon: TrendUp },
              ].map(({ to, label, Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-zinc-800/60 hover:border-zinc-700 hover:bg-zinc-900/40 transition-all group"
                >
                  <Icon size={15} className="text-zinc-500" weight="duotone" />
                  <span className="text-sm text-zinc-400 group-hover:text-zinc-200 transition-colors">{label}</span>
                  <ArrowRight size={13} className="ml-auto text-zinc-700 group-hover:text-zinc-500 transition-colors" />
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Create Drive Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6"
          >
            <h2 className="text-lg font-semibold text-zinc-100 mb-5">Create Placement Drive</h2>
            <form onSubmit={createDrive} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400">Drive title</label>
                  <input required value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))}
                    placeholder="SDE Hiring 2025"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400">Company</label>
                  <input required value={form.company} onChange={e => setForm(f=>({...f,company:e.target.value}))}
                    placeholder="Infosys"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">Type</label>
                <select value={form.type} onChange={e => setForm(f=>({...f,type:e.target.value}))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/60">
                  <option value="placement">Placement</option>
                  <option value="internship">Internship</option>
                  <option value="hackathon">Hackathon</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">Description / JD</label>
                <textarea required rows={3} value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))}
                  placeholder="Looking for candidates with Node.js, React, and cloud experience..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60 resize-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">Required Skills <span className="text-zinc-600">(comma-separated)</span></label>
                <input value={form.requiredSkills} onChange={e => setForm(f=>({...f,requiredSkills:e.target.value}))}
                  placeholder="React, Node.js, MongoDB"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">Apply Deadline</label>
                <input type="date" value={form.deadline} onChange={e => setForm(f=>({...f,deadline:e.target.value}))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/60" />
              </div>

              {/* Eligibility section */}
              <div className="border-t border-zinc-800/60 pt-3">
                <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-semibold mb-3">Eligibility Criteria</p>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs text-zinc-400">Departments <span className="text-zinc-600">(comma-separated, leave blank for all)</span></label>
                    <input value={form.eligDepts} onChange={e => setForm(f=>({...f,eligDepts:e.target.value}))}
                      placeholder="CSE, IT, ECE"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-400">Min Year of Study</label>
                      <input type="number" min="1" max="5" value={form.eligMinYear} onChange={e => setForm(f=>({...f,eligMinYear:e.target.value}))}
                        placeholder="e.g. 3"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-400">Max Year of Study</label>
                      <input type="number" min="1" max="5" value={form.eligMaxYear} onChange={e => setForm(f=>({...f,eligMaxYear:e.target.value}))}
                        placeholder="e.g. 4"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60" />
                    </div>
                  </div>
                </div>
              </div>

              {createErr && <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{createErr}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 border border-zinc-800 hover:border-zinc-700 text-zinc-400 text-sm py-2 rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors active:scale-[0.98]">
                  {creating ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
