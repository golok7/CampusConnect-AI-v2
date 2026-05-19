import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../contexts/AuthContext.jsx";
import { userApi, githubApi, recommendApi, leaderboardApi, drivesApi } from "../services/api.js";
import {
  GithubLogo, Microphone, Briefcase, FileText, GitBranch,
  ArrowRight, ArrowUpRight, Warning, PencilSimple, X,
  Lightning, Brain, TrendUp, Star, Target, Gauge,
  Sparkle, MagnifyingGlass, Code, ChartBar, Cpu,
  CheckCircle, Robot, Hexagon, Buildings, CalendarBlank,
  Eye, ArrowsOut, CircleNotch, WarningOctagon,
} from "@phosphor-icons/react";
import {
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

// ─── Domain config ─────────────────────────────────────────────────────────

const DOMAIN_CFG = {
  frontend:            { label: "Frontend",       Icon: Code,      glow: "#06b6d4", grad: ["#06b6d4","#0284c7"], border: "border-cyan-500/25"    },
  ai_ml:               { label: "AI / ML",         Icon: Brain,     glow: "#a855f7", grad: ["#a855f7","#7c3aed"], border: "border-purple-500/25"  },
  backend:             { label: "Backend",         Icon: Cpu,       glow: "#10b981", grad: ["#10b981","#0d9488"], border: "border-emerald-500/25" },
  algorithms:          { label: "Algorithms",      Icon: ChartBar,  glow: "#f59e0b", grad: ["#f59e0b","#ea580c"], border: "border-amber-500/25"   },
  genai:               { label: "GenAI",           Icon: Sparkle,   glow: "#ec4899", grad: ["#ec4899","#a855f7"], border: "border-pink-500/25"    },
  devops:              { label: "DevOps",          Icon: Lightning, glow: "#3b82f6", grad: ["#3b82f6","#4f46e5"], border: "border-blue-500/25"    },
  data_science:        { label: "Data Science",    Icon: TrendUp,   glow: "#14b8a6", grad: ["#14b8a6","#06b6d4"], border: "border-teal-500/25"    },
  agentic_ai:          { label: "Agentic AI",      Icon: Robot,     glow: "#8b5cf6", grad: ["#8b5cf6","#a855f7"], border: "border-violet-500/25"  },
  cybersecurity:       { label: "Security",        Icon: Target,    glow: "#f43f5e", grad: ["#f43f5e","#dc2626"], border: "border-rose-500/25"    },
  distributed_systems: { label: "Distributed",     Icon: GitBranch, glow: "#38bdf8", grad: ["#38bdf8","#3b82f6"], border: "border-sky-500/25"     },
  database:            { label: "Database",        Icon: Hexagon,   glow: "#6366f1", grad: ["#6366f1","#3b82f6"], border: "border-indigo-500/25"  },
  data_engineering:    { label: "Data Eng.",       Icon: ChartBar,  glow: "#06b6d4", grad: ["#06b6d4","#0891b2"], border: "border-cyan-500/25"    },
};

function domainCfg(d) {
  return DOMAIN_CFG[d] || { label: d.replace(/_/g," "), Icon: Code, glow:"#71717a", grad:["#71717a","#52525b"], border:"border-zinc-600/25" };
}

// ─── AI Score Ring (SVG radial) ─────────────────────────────────────────────

function AIScoreRing({ score, loading }) {
  const R = 52, stroke = 8;
  const circ = 2 * Math.PI * R;
  const pct  = Math.min(Math.max(score || 0, 0), 100);
  const off  = circ * (1 - pct / 100);
  const tier = pct >= 80 ? { color: "#06b6d4", label: "Elite" }
             : pct >= 60 ? { color: "#a855f7", label: "Advanced" }
             : pct >= 40 ? { color: "#10b981", label: "Rising" }
             : { color: "#52525b", label: "Building" };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: 140, height: 140 }}>
        {/* Ambient glow */}
        <div className="absolute inset-0 rounded-full" style={{
          background: `radial-gradient(circle, ${tier.color}30 0%, transparent 70%)`,
          filter: "blur(8px)",
        }} />
        <svg width={140} height={140} style={{ transform: "rotate(-90deg)" }} className="relative">
          <defs>
            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
          <circle cx={70} cy={70} r={R} fill="none" stroke="#1f1f22" strokeWidth={stroke} />
          {!loading && (
            <motion.circle
              cx={70} cy={70} r={R}
              fill="none"
              stroke="url(#ringGrad)"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circ}
              initial={{ strokeDashoffset: circ }}
              animate={{ strokeDashoffset: off }}
              transition={{ duration: 1.6, ease: [0.16,1,0.3,1], delay: 0.4 }}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {loading ? (
            <div className="w-12 h-12 rounded-full bg-zinc-800/60 animate-pulse" />
          ) : (
            <>
              <span className="text-3xl font-bold tabular-nums leading-none" style={{ color: tier.color }}>
                {Math.round(pct)}
              </span>
              <span className="text-[9px] tracking-widest uppercase text-zinc-600 mt-1 font-medium">
                {tier.label}
              </span>
            </>
          )}
        </div>
      </div>
      <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-medium">Talent Score</p>
    </div>
  );
}

// ─── Domain Card ────────────────────────────────────────────────────────────

function DomainCard({ domain, score, maxScore, rank }) {
  const cfg   = domainCfg(domain);
  const { Icon } = cfg;
  const barW  = Math.round((score / maxScore) * 100);
  const label = Math.round(score);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + rank * 0.07, duration: 0.4 }}
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
      className={`relative overflow-hidden rounded-xl border ${cfg.border} bg-zinc-900/70 backdrop-blur-sm p-4 cursor-default`}
      style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04)` }}
    >
      {/* Corner glow */}
      <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl opacity-20"
        style={{ background: `radial-gradient(circle, ${cfg.glow}, transparent)` }}
      />

      <div className="flex items-start justify-between mb-3 relative">
        <div className="p-1.5 rounded-lg"
          style={{ background: `linear-gradient(135deg, ${cfg.grad[0]}25, ${cfg.grad[1]}15)`, border: `1px solid ${cfg.glow}25` }}
        >
          <Icon size={13} weight="bold" style={{ color: cfg.glow }} />
        </div>
        {rank === 0 && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
            style={{ background: `${cfg.glow}15`, color: cfg.glow, border: `1px solid ${cfg.glow}30` }}
          >
            #1
          </span>
        )}
      </div>

      <p className="text-[11px] font-medium text-zinc-300 truncate relative">{cfg.label}</p>
      <p className="text-xl font-bold tabular-nums text-zinc-100 mt-0.5 relative">{label}</p>

      {/* Score bar */}
      <div className="mt-2.5 h-0.5 bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${cfg.grad[0]}, ${cfg.grad[1]})` }}
          initial={{ width: 0 }}
          animate={{ width: `${barW}%` }}
          transition={{ duration: 1.1, ease: "easeOut", delay: 0.25 + rank * 0.08 }}
        />
      </div>
    </motion.div>
  );
}

// ─── Insight Card ────────────────────────────────────────────────────────────

const I_COLORS = {
  purple: { ring: "#a855f7", bg: "rgba(168,85,247,0.07)", border: "rgba(168,85,247,0.2)" },
  emerald:{ ring: "#10b981", bg: "rgba(16,185,129,0.07)", border: "rgba(16,185,129,0.2)" },
  cyan:   { ring: "#06b6d4", bg: "rgba(6,182,212,0.07)",  border: "rgba(6,182,212,0.2)"  },
  amber:  { ring: "#f59e0b", bg: "rgba(245,158,11,0.07)", border: "rgba(245,158,11,0.2)" },
  sky:    { ring: "#38bdf8", bg: "rgba(56,189,248,0.07)", border: "rgba(56,189,248,0.2)" },
};

function InsightCard({ ins, i }) {
  const { Icon, text, color } = ins;
  const c = I_COLORS[color] || I_COLORS.cyan;
  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.08 + i * 0.07 }}
      className="shrink-0 w-72 rounded-xl p-4"
      style={{ background: c.bg, border: `1px solid ${c.border}` }}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5 p-1.5 rounded-lg" style={{ background: `${c.ring}18`, border: `1px solid ${c.ring}25` }}>
          <Icon size={12} weight="bold" style={{ color: c.ring }} />
        </div>
        <p className="text-[12px] text-zinc-300 leading-relaxed">{text}</p>
      </div>
    </motion.div>
  );
}

// ─── Opportunity Card ────────────────────────────────────────────────────────

function OpportunityCard({ job, i, onClick }) {
  const fit  = job.fitScore != null ? Math.round(job.fitScore * 100) : null;
  const fitC = fit >= 80 ? "#10b981" : fit >= 60 ? "#06b6d4" : "#f59e0b";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + i * 0.08 }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      onClick={onClick}
      className="relative overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4 hover:border-zinc-700 transition-colors cursor-pointer"
      style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)" }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-100 truncate">{job.title || job.name}</p>
          <p className="text-xs text-zinc-500 mt-0.5 truncate">{job.company}</p>
        </div>
        {fit != null && (
          <div className="text-right shrink-0">
            <p className="text-lg font-bold tabular-nums leading-none" style={{ color: fitC }}>{fit}%</p>
            <p className="text-[9px] text-zinc-600 mt-0.5">AI match</p>
          </div>
        )}
      </div>

      {/* Skill tags */}
      {job.requiredSkills?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {job.requiredSkills.slice(0, 3).map(s => (
            <span key={s}
              className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-400 border border-zinc-700/50"
            >{s}</span>
          ))}
          {job.requiredSkills.length > 3 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-600">
              +{job.requiredSkills.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Fit bar */}
      {fit != null && (
        <div className="mt-3 h-0.5 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: fitC }}
            initial={{ width: 0 }}
            animate={{ width: `${fit}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 + i * 0.1 }}
          />
        </div>
      )}
    </motion.div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Sk({ className }) {
  return <div className={`animate-pulse bg-zinc-800/50 rounded-xl ${className}`} />;
}

// ─── Build AI insights client-side ──────────────────────────────────────────

function buildInsights(profile, rank) {
  const ins    = [];
  const doms   = profile?.topDomains  || [];
  const score  = profile?.activityScore || 0;
  const skills = profile?.normalizedSkills?.length || 0;

  if (doms[0]) {
    const d = domainCfg(doms[0].domain).label;
    ins.push({ Icon: Brain, color: "purple",
      text: `Strong ${d} signals detected across your repositories — your most impactful domain.` });
  }
  if (score > 0) {
    const top = Math.max(1, Math.round(100 - Math.min(score, 99)));
    ins.push({ Icon: TrendUp, color: "emerald",
      text: `Activity score ${Math.round(score)} puts you in the top ${top}% of active campus developers.` });
  }
  if (rank && rank <= 20) {
    ins.push({ Icon: Star, color: "amber",
      text: `Ranked #${rank} on the campus leaderboard — you're among the platform's top performers.` });
  }
  if (skills >= 15) {
    ins.push({ Icon: CheckCircle, color: "cyan",
      text: `${skills} skills semantically indexed — recruiters can match your profile with high confidence.` });
  } else if (skills > 0) {
    ins.push({ Icon: Target, color: "sky",
      text: `${skills} skills indexed. Contribute to more open-source projects to boost recruiter visibility.` });
  }
  if (doms.length >= 3) {
    const labels = doms.slice(0, 3).map(d => domainCfg(d.domain).label);
    ins.push({ Icon: Sparkle, color: "purple",
      text: `Multi-domain profile: ${labels.join(", ")} — signals high engineering versatility.` });
  }
  if (ins.length < 4) {
    ins.push({ Icon: Briefcase, color: "sky",
      text: "Complete a mock interview to boost your AI-computed match score with recruiters." });
  }
  return ins.slice(0, 4);
}

// ─── Setup Banner ─────────────────────────────────────────────────────────────

const BANNER_GITHUB = "cc_banner_github_dismissed";
const BANNER_RESUME = "cc_banner_resume_dismissed";

function SetupBanner({ hasGithub, hasResume }) {
  const navigate = useNavigate();
  const [showGithub, setShowGithub] = useState(false);
  const [showResume, setShowResume] = useState(false);

  useEffect(() => {
    if (!hasGithub && !sessionStorage.getItem(BANNER_GITHUB)) setShowGithub(true);
    if (!hasResume  && !sessionStorage.getItem(BANNER_RESUME))  setShowResume(true);
  }, [hasGithub, hasResume]);

  const dismissGithub = useCallback(() => {
    sessionStorage.setItem(BANNER_GITHUB, "1");
    setShowGithub(false);
  }, []);

  const dismissResume = useCallback(() => {
    sessionStorage.setItem(BANNER_RESUME, "1");
    setShowResume(false);
  }, []);

  const banners = [
    {
      show: showGithub,
      dismiss: dismissGithub,
      icon: <GithubLogo size={16} weight="fill" />,
      color: "from-violet-500/10 to-transparent border-violet-500/20",
      iconColor: "text-violet-400",
      title: "GitHub not connected",
      desc: "Connect your GitHub to unlock your AI score, domain profiling, and recruiter visibility.",
      action: () => { dismissGithub(); navigate("/dashboard"); },
      actionLabel: "Connect GitHub",
      actionColor: "bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 border-violet-500/30",
    },
    {
      show: showResume,
      dismiss: dismissResume,
      icon: <FileText size={16} weight="fill" />,
      color: "from-amber-500/10 to-transparent border-amber-500/20",
      iconColor: "text-amber-400",
      title: "Resume not uploaded",
      desc: "Upload your resume so AI can extract your skills, match you to jobs, and suggest improvements.",
      action: () => { dismissResume(); navigate("/resume"); },
      actionLabel: "Upload Resume",
      actionColor: "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/30",
    },
  ];

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {banners.map((b, i) => b.show && (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: -12, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border bg-gradient-to-r ${b.color} backdrop-blur-sm`}>
              <span className={`shrink-0 ${b.iconColor}`}>{b.icon}</span>
              <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <span className="text-xs font-semibold text-zinc-200 shrink-0">{b.title}</span>
                <span className="text-xs text-zinc-500 truncate">{b.desc}</span>
              </div>
              <button
                onClick={b.action}
                className={`shrink-0 text-[11px] font-medium px-3 py-1.5 rounded-lg border transition-colors ${b.actionColor}`}
              >
                {b.actionLabel}
              </button>
              <button
                onClick={b.dismiss}
                className="shrink-0 text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function StudentDashboard() {
  const { user: authUser } = useAuth();
  const [profile,       setProfile]       = useState(null);
  const [jobs,          setJobs]          = useState([]);
  const [rank,          setRank]          = useState(null);
  const [drives,        setDrives]        = useState([]);
  const [applyingId,    setApplyingId]    = useState(null);
  const [appliedIds,    setAppliedIds]    = useState(new Set());
  const [selectedDrive, setSelectedDrive] = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [githubInput,   setGithubInput]   = useState("");
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubError,   setGithubError]   = useState("");
  const [editingGithub, setEditingGithub] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [p, r, j, d] = await Promise.allSettled([
          userApi.profile(),
          leaderboardApi.get(),
          recommendApi.jobs(),
          drivesApi.listActive(),
        ]);
        if (p.status === "fulfilled") setProfile(p.value);
        if (r.status === "fulfilled") {
          const board = r.value?.leaderboard || r.value || [];
          const idx   = board.findIndex(u => u._id === authUser?.id);
          if (idx !== -1) setRank(idx + 1);
        }
        if (j.status === "fulfilled") {
          const raw = j.value || [];
          // backend returns [{ drive, score }] — flatten to { ...drive, fitScore }
          const mapped = raw.map(item =>
            item?.drive ? { ...item.drive, fitScore: item.score } : item
          ).filter(Boolean).slice(0, 4);
          setJobs(mapped);
        }
        if (d.status === "fulfilled") {
          const list = Array.isArray(d.value) ? d.value : [];
          setDrives(list.slice(0, 6));
          setAppliedIds(new Set(list.filter(dr => dr.applied).map(dr => dr._id)));
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [authUser]);

  async function applyToDrive(driveId) {
    setApplyingId(driveId);
    try {
      await drivesApi.apply(driveId);
      setAppliedIds(prev => new Set([...prev, driveId]));
    } catch (err) {
      if (err.message?.includes("Already")) {
        setAppliedIds(prev => new Set([...prev, driveId]));
      }
    } finally {
      setApplyingId(null);
    }
  }

  async function fetchGithub() {
    if (!githubInput.trim()) return;
    setGithubLoading(true); setGithubError("");
    try {
      await githubApi.fetch(githubInput.trim());
      const p = await userApi.profile();
      setProfile(p);
      setGithubInput("");
      setEditingGithub(false);
    } catch (err) {
      setGithubError(err.message || "GitHub fetch failed");
    } finally {
      setGithubLoading(false);
    }
  }

  const hasGithub  = !!profile?.githubUsername;
  const topDomains = profile?.topDomains?.slice(0, 6) || [];
  const maxDomSco  = topDomains[0]?.score || 1;
  const firstName  = profile?.name?.split(" ")[0] || "there";

  // composite talent score (0-100)
  const talentScore = useMemo(() => {
    if (!profile) return 0;
    const a = Math.min(profile.activityScore || 0, 100);
    const s = Math.min((profile.normalizedSkills?.length || 0) * 1.5, 30);
    const d = Math.min(topDomains.length * 5, 20);
    return Math.min(Math.round(a * 0.5 + s * 0.3 + d * 0.2), 100);
  }, [profile, topDomains]);

  const insights = useMemo(() => buildInsights(profile, rank), [profile, rank]);

  // estimated weekly bars from activityScore
  const weekBars = useMemo(() => {
    if (!profile?.activityScore) return [];
    const b = profile.activityScore;
    const multipliers = [0.6, 0.85, 1.0, 0.9, 0.75, 0.3, 0.2];
    return ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((day, i) => ({
      day, v: Math.max(1, Math.round(b * 0.08 * multipliers[i])),
    }));
  }, [profile]);

  // ──────────────────────────────────────────────────────────────────────────

  return (
    <>
    <div className="min-h-screen bg-zinc-950">

      {/* Global mesh */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/4 w-[600px] h-[400px] rounded-full opacity-[0.04]"
          style={{ background: "radial-gradient(ellipse, #06b6d4, transparent)", filter: "blur(80px)" }} />
        <div className="absolute top-0 right-0 w-[500px] h-[400px] rounded-full opacity-[0.03]"
          style={{ background: "radial-gradient(ellipse, #a855f7, transparent)", filter: "blur(80px)" }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Setup banners ── */}
        {!loading && (
          <SetupBanner
            hasGithub={!!profile?.githubUsername}
            hasResume={!!profile?.resumeData?.skills?.length}
          />
        )}

        {/* ════════════════════════════════════════════════════════
            HERO
        ════════════════════════════════════════════════════════ */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900/50 backdrop-blur-sm p-6 sm:p-8"
          style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0 1px rgba(255,255,255,0.01)" }}
        >
          {/* Hero inner glow */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
            <div className="absolute top-0 right-0 w-1/2 h-full opacity-[0.06]"
              style={{ background: "radial-gradient(ellipse at 100% 50%, #a855f7, transparent 70%)" }} />
            <div className="absolute top-0 left-0 w-1/3 h-full opacity-[0.04]"
              style={{ background: "radial-gradient(ellipse at 0% 50%, #06b6d4, transparent 70%)" }} />
          </div>

          <div className="relative flex flex-col lg:flex-row gap-8 lg:items-center">

            {/* Left: Identity */}
            <div className="flex-1 min-w-0">
              {/* Status pill */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-semibold">
                  AI Talent Profile Active
                </span>
              </div>

              {loading ? (
                <div className="space-y-2">
                  <Sk className="h-12 w-64" />
                  <Sk className="h-4 w-40 mt-2" />
                  <Sk className="h-4 w-80 mt-3" />
                </div>
              ) : (
                <>
                  <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
                    <span className="text-zinc-400">Hey, </span>
                    <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                      {firstName}
                    </span>
                  </h1>

                  {/* GitHub row */}
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    {hasGithub && !editingGithub ? (
                      <>
                        <GithubLogo size={14} className="text-zinc-500" />
                        <span className="text-sm text-zinc-400 font-mono">@{profile.githubUsername}</span>
                        <button
                          onClick={() => { setEditingGithub(true); setGithubInput(profile.githubUsername); setGithubError(""); }}
                          className="text-zinc-700 hover:text-zinc-400 transition-colors"
                        >
                          <PencilSimple size={12} />
                        </button>
                      </>
                    ) : !hasGithub && !editingGithub ? (
                      <button
                        onClick={() => setEditingGithub(true)}
                        className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 border border-amber-500/30 bg-amber-500/5 px-3 py-1.5 rounded-full transition-colors"
                      >
                        <Warning size={12} />
                        Connect GitHub to activate AI profile
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          value={githubInput}
                          onChange={e => setGithubInput(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && fetchGithub()}
                          placeholder="github-username"
                          autoFocus
                          className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50 w-44"
                        />
                        <button
                          onClick={fetchGithub}
                          disabled={githubLoading}
                          className="text-xs bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
                        >
                          {githubLoading ? "…" : "Fetch"}
                        </button>
                        <button
                          onClick={() => { setEditingGithub(false); setGithubInput(""); setGithubError(""); }}
                          className="text-zinc-600 hover:text-zinc-400 p-1"
                        >
                          <X size={14} />
                        </button>
                        {githubError && <p className="text-xs text-rose-400">{githubError}</p>}
                      </div>
                    )}
                  </div>

                  {/* Domain pills */}
                  {topDomains.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {topDomains.slice(0, 5).map(({ domain }) => {
                        const c = domainCfg(domain);
                        return (
                          <span key={domain}
                            className="text-[11px] px-2.5 py-1 rounded-full font-medium text-zinc-300"
                            style={{ background: `${c.glow}12`, border: `1px solid ${c.glow}28`, color: c.glow }}
                          >
                            {c.label}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* AI bio line */}
                  {hasGithub && (
                    <p className="text-sm text-zinc-500 mt-4 max-w-lg leading-relaxed">
                      {topDomains[0]
                        ? `Primarily a ${domainCfg(topDomains[0].domain).label} engineer · ${profile.normalizedSkills?.length || 0} indexed skills across ${topDomains.length} domain${topDomains.length > 1 ? "s" : ""}${rank ? ` · Campus rank #${rank}` : ""}.`
                        : "GitHub connected. Your AI profile is being built from repository data."}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Right: Score ring + stat strip */}
            <div className="flex items-center gap-8 shrink-0">
              <AIScoreRing score={talentScore} loading={loading} />

              {!loading && (
                <div className="flex flex-col gap-5">
                  {[
                    { label: "Activity", value: profile?.activityScore != null ? Math.round(profile.activityScore) : "—", color: "#06b6d4" },
                    { label: "Skills",   value: profile?.normalizedSkills?.length ?? "—",                                  color: "#a855f7" },
                    { label: "Rank",     value: rank ? `#${rank}` : "—",                                                   color: "#10b981" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex flex-col">
                      <span className="text-[9px] uppercase tracking-widest text-zinc-600 font-semibold">{label}</span>
                      <span className="text-xl font-bold tabular-nums mt-0.5" style={{ color }}>{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </motion.section>

        {/* ════════════════════════════════════════════════════════
            AI INSIGHTS STRIP
        ════════════════════════════════════════════════════════ */}
        {!loading && hasGithub && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Brain size={12} className="text-purple-400" />
              <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold">AI Insights</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {insights.map((ins, i) => <InsightCard key={i} ins={ins} i={i} />)}
            </div>
          </section>
        )}

        {/* ════════════════════════════════════════════════════════
            DOMAIN INTELLIGENCE
        ════════════════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Gauge size={12} className="text-cyan-400" />
              <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold">Domain Intelligence</span>
            </div>
            {topDomains.length > 0 && (
              <span className="text-[10px] text-zinc-700">{topDomains.length} domains · scored by weighted repo contribution</span>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[1,2,3,4,5,6].map(i => <Sk key={i} className="h-28" />)}
            </div>
          ) : topDomains.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {topDomains.map(({ domain, score }, i) => (
                <DomainCard key={domain} domain={domain} score={score} maxScore={maxDomSco} rank={i} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20 p-8 text-center">
              <p className="text-sm text-zinc-600">Connect GitHub to unlock domain intelligence</p>
            </div>
          )}
        </section>

        {/* ════════════════════════════════════════════════════════
            BENTO ROW: Opportunities + Quick Actions
        ════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Opportunities — 2 cols */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Briefcase size={12} className="text-emerald-400" />
                <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold">Opportunity Matches</span>
              </div>
              <Link to="/jobs" className="text-[11px] text-cyan-500 hover:text-cyan-300 flex items-center gap-1 transition-colors">
                All jobs <ArrowRight size={11} />
              </Link>
            </div>

            {loading ? (
              <div className="grid sm:grid-cols-2 gap-3">
                {[1,2,3,4].map(i => <Sk key={i} className="h-24" />)}
              </div>
            ) : jobs.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-3">
                {jobs.map((job, i) => (
                  <OpportunityCard key={job._id || i} job={job} i={i} onClick={() => setSelectedDrive(job)} />
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20 p-10 flex flex-col items-center text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-zinc-800/60 flex items-center justify-center mb-3"
                  style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}
                >
                  <Briefcase size={18} className="text-zinc-600" />
                </div>
                <p className="text-sm font-medium text-zinc-400 mb-1">No active matches yet</p>
                <p className="text-xs text-zinc-600 max-w-xs leading-relaxed">
                  {hasGithub
                    ? "No recruiter drives match your profile yet. Browse open opportunities or check back soon."
                    : "Connect GitHub to get AI-powered opportunity matching."}
                </p>
                <Link to="/jobs"
                  className="mt-4 text-xs text-cyan-500 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                >
                  Browse opportunities <ArrowUpRight size={11} />
                </Link>
              </motion.div>
            )}
          </div>

          {/* Quick Actions — 1 col */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Lightning size={12} className="text-amber-400" />
              <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold">Quick Actions</span>
            </div>
            <div className="space-y-2">
              {[
                {
                  to: "/interview", Icon: Microphone, label: "AI Mock Interview",
                  desc: "Groq Llama · voice enabled", accent: "#10b981", key: "⌘I",
                },
                {
                  to: "/resume", Icon: FileText, label: "Resume Intelligence",
                  desc: "AI analysis + improvement", accent: "#38bdf8", key: "⌘R",
                },
                {
                  to: "/explore", Icon: MagnifyingGlass, label: "Explore Developers",
                  desc: "Semantic profile search", accent: "#a855f7", key: "⌘E",
                },
                {
                  to: "/jobs", Icon: Briefcase, label: "Browse Opportunities",
                  desc: "AI-matched placements", accent: "#f59e0b", key: "⌘J",
                },
                {
                  to: "/leaderboard", Icon: Star, label: "Campus Leaderboard",
                  desc: "Rank among top engineers", accent: "#f43f5e", key: null,
                },
              ].map(({ to, Icon, label, desc, accent, key }, i) => (
                <motion.div
                  key={to}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.07 }}
                  whileHover={{ scale: 1.015, transition: { duration: 0.12 } }}
                >
                  <Link
                    to={to}
                    className="group flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-zinc-800/60 hover:border-zinc-700/80 bg-zinc-900/40 hover:bg-zinc-900/80 transition-all"
                    style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.02)" }}
                  >
                    <div className="p-1.5 rounded-lg transition-colors"
                      style={{ background: `${accent}18`, border: `1px solid ${accent}22` }}
                    >
                      <Icon size={13} weight="bold" style={{ color: accent }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-zinc-200">{label}</p>
                      <p className="text-[10px] text-zinc-600 truncate mt-0.5">{desc}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {key && (
                        <span className="hidden sm:block text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-600 font-mono border border-zinc-700/40">
                          {key}
                        </span>
                      )}
                      <ArrowRight size={12} className="text-zinc-700 group-hover:text-zinc-500 transition-colors" />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════
            CAMPUS DRIVES
        ════════════════════════════════════════════════════════ */}
        {drives.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Buildings size={12} className="text-violet-400" />
                <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold">Campus Drives</span>
              </div>
              <span className="text-[10px] text-zinc-700">{drives.length} active</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {drives.map((drive, i) => {
                const applied  = appliedIds.has(drive._id);
                const deadline = drive.deadline
                  ? new Date(drive.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                  : null;
                return (
                  <motion.div
                    key={drive._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4 flex flex-col gap-3 hover:border-zinc-700 transition-colors cursor-pointer"
                    style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.02)" }}
                    onClick={() => setSelectedDrive(drive)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-200 truncate">{drive.title}</p>
                        <p className="text-xs text-zinc-500 truncate mt-0.5">{drive.company}</p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border capitalize shrink-0 ${
                        drive.type === "placement"  ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" :
                        drive.type === "internship" ? "border-cyan-500/30 text-cyan-400 bg-cyan-500/10" :
                        "border-violet-500/30 text-violet-400 bg-violet-500/10"
                      }`}>
                        {drive.type}
                      </span>
                    </div>
                    {drive.requiredSkills?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {drive.requiredSkills.slice(0, 3).map(s => (
                          <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800/60 text-zinc-500 border border-zinc-700/40">{s}</span>
                        ))}
                        {drive.requiredSkills.length > 3 && (
                          <span className="text-[10px] text-zinc-700">+{drive.requiredSkills.length - 3}</span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-auto">
                      {deadline && (
                        <div className="flex items-center gap-1 text-[10px] text-zinc-600">
                          <CalendarBlank size={10} />
                          {deadline}
                        </div>
                      )}
                      <div className="flex items-center gap-2 ml-auto">
                        {applied && (
                          <div className="flex items-center gap-1 text-[11px] text-emerald-500 font-medium">
                            <CheckCircle size={12} weight="fill" /> Applied
                          </div>
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); setSelectedDrive(drive); }}
                          className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-violet-400 transition-colors"
                        >
                          <Eye size={11} /> View
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            ACTIVITY + COLLABORATION
        ════════════════════════════════════════════════════════ */}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

            {/* Activity bar chart */}
            <div className="sm:col-span-2 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5"
              style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)" }}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <ChartBar size={12} className="text-cyan-400" />
                  <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold">Weekly Activity</span>
                </div>
                {weekBars.length > 0 && (
                  <span className="text-[10px] text-zinc-700">estimated from activity score</span>
                )}
              </div>

              {weekBars.length > 0 ? (
                <ResponsiveContainer width="100%" height={90}>
                  <BarChart data={weekBars} barSize={22} barGap={4}>
                    <XAxis
                      dataKey="day"
                      axisLine={false} tickLine={false}
                      tick={{ fill: "#52525b", fontSize: 10, fontFamily: "monospace" }}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.02)" }}
                      contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8, fontSize: 11, padding: "6px 10px" }}
                      labelStyle={{ color: "#71717a", marginBottom: 2 }}
                      itemStyle={{ color: "#06b6d4" }}
                      formatter={v => [`${v} commits`, ""]}
                    />
                    <defs>
                      <linearGradient id="actBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#06b6d4" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.2} />
                      </linearGradient>
                    </defs>
                    <Bar dataKey="v" radius={[4,4,0,0]}>
                      {weekBars.map((_, i) => (
                        <Cell key={i} fill={i >= 5 ? "#1f1f22" : "url(#actBar)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-24 flex items-center justify-center rounded-lg border border-dashed border-zinc-800">
                  <p className="text-xs text-zinc-700">Connect GitHub to see activity data</p>
                </div>
              )}
            </div>

            {/* Collaboration card */}
            <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5 flex flex-col"
              style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)" }}
            >
              <div className="flex items-center gap-2 mb-5">
                <GitBranch size={12} className="text-purple-400" />
                <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold">Collaboration</span>
              </div>

              <div className="flex-1 space-y-4">
                {[
                  {
                    label: "Teamwork Score",
                    value: profile?.githubData?.teamworkScore
                        ?? profile?.githubData?.collaborationData?.teamworkScore
                        ?? "—",
                    color: "#a855f7",
                    sub: "PR & collab activity",
                  },
                  {
                    label: "Leaderboard Rank",
                    value: rank ? `#${rank}` : "—",
                    color: "#f59e0b",
                    sub: "campus ranking",
                  },
                  {
                    label: "Activity Score",
                    value: profile?.activityScore != null ? Math.round(profile.activityScore) : "—",
                    color: "#06b6d4",
                    sub: "GitHub contributions",
                  },
                ].map(({ label, value, color, sub }) => (
                  <div key={label}>
                    <p className="text-[9px] uppercase tracking-widest text-zinc-600 font-semibold mb-0.5">{label}</p>
                    <p className="text-xl font-bold tabular-nums" style={{ color }}>{value}</p>
                    <p className="text-[10px] text-zinc-700 mt-0.5">{sub}</p>
                  </div>
                ))}
              </div>

              <Link to="/leaderboard"
                className="mt-4 text-[11px] text-zinc-600 hover:text-zinc-400 flex items-center gap-1 transition-colors"
              >
                Full leaderboard <ArrowUpRight size={11} />
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>

    {/* Drive detail modal */}
    <AnimatePresence>
      {selectedDrive && (
        <DriveDetailModal
          drive={selectedDrive}
          applied={appliedIds.has(selectedDrive._id)}
          onApply={async () => {
            await applyToDrive(selectedDrive._id);
          }}
          onClose={() => setSelectedDrive(null)}
        />
      )}
    </AnimatePresence>
    </>
  );
}

// ─── Drive Detail Modal ──────────────────────────────────────────────────────

function DriveDetailModal({ drive, applied, onApply, onClose }) {
  const [tab,      setTab]      = useState("overview");
  const [applying, setApplying] = useState(false);
  const [done,     setDone]     = useState(applied);

  // AI gap analysis state
  const [analysing, setAnalysing] = useState(false);
  const [analysis,  setAnalysis]  = useState(null);
  const [analysisErr, setAnalysisErr] = useState("");

  const deadline = drive.deadline
    ? new Date(drive.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : null;

  const elig = drive.eligibility || {};

  async function handleApply() {
    setApplying(true);
    try { await onApply(); setDone(true); }
    catch { setDone(true); }
    finally { setApplying(false); }
  }

  async function runAnalysis() {
    const jd = [
      drive.title,
      drive.company,
      drive.description || "",
      drive.requiredSkills?.length ? `Required skills: ${drive.requiredSkills.join(", ")}` : "",
    ].filter(Boolean).join("\n");

    setAnalysing(true); setAnalysis(null); setAnalysisErr("");
    try {
      const r = await drivesApi.analyze(jd);
      setAnalysis(r.analysis || r);
    } catch (e) {
      setAnalysisErr(e.message || "Make sure you have a resume uploaded first.");
    } finally {
      setAnalysing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-zinc-950/80 backdrop-blur-sm px-0 sm:px-4">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="w-full sm:max-w-2xl bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl flex flex-col"
        style={{ maxHeight: "90vh", boxShadow: "0 0 0 1px rgba(139,92,246,0.12), 0 24px 48px rgba(0,0,0,0.7)" }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-zinc-800/60 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-zinc-100 truncate">{drive.title}</h2>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border capitalize shrink-0 ${
                  drive.type === "placement"  ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" :
                  drive.type === "internship" ? "border-cyan-500/30 text-cyan-400 bg-cyan-500/10" :
                  "border-violet-500/30 text-violet-400 bg-violet-500/10"
                }`}>{drive.type}</span>
              </div>
              <p className="text-sm text-zinc-500 mt-0.5">{drive.company}</p>
            </div>
            <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors shrink-0 mt-0.5">
              <X size={16} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            {[
              { id: "overview",  label: "Overview" },
              { id: "eligibility", label: "Eligibility" },
              { id: "analysis", label: "AI Gap Analysis" },
            ].map(({ id, label }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors font-medium ${
                  tab === id
                    ? "bg-violet-500/15 text-violet-400 border border-violet-500/25"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Overview tab */}
          {tab === "overview" && (
            <>
              {/* Meta row */}
              <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
                {deadline && (
                  <span className="flex items-center gap-1.5">
                    <CalendarBlank size={12} className="text-zinc-600" />
                    Apply by <span className="text-zinc-300 font-medium">{deadline}</span>
                  </span>
                )}
                {drive.applicationCount > 0 && (
                  <span className="text-zinc-600">{drive.applicationCount} applicants</span>
                )}
              </div>

              {/* Required Skills */}
              {drive.requiredSkills?.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-semibold mb-2">Required Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {drive.requiredSkills.map(s => (
                      <span key={s}
                        className="text-[11px] px-2.5 py-1 rounded-full border border-violet-500/20 text-violet-300"
                        style={{ background: "rgba(139,92,246,0.06)" }}
                      >{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* JD */}
              {drive.description && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-semibold mb-2">Job Description</p>
                  <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">{drive.description}</p>
                </div>
              )}
            </>
          )}

          {/* Eligibility tab */}
          {tab === "eligibility" && (
            <div className="space-y-4">
              {deadline && (
                <div className="flex items-start gap-3 p-3 rounded-xl border border-zinc-800/60 bg-zinc-900/30">
                  <CalendarBlank size={14} className="text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-zinc-300">Application Deadline</p>
                    <p className="text-sm text-amber-400 font-medium mt-0.5">{deadline}</p>
                  </div>
                </div>
              )}

              {elig.departments?.length > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-xl border border-zinc-800/60 bg-zinc-900/30">
                  <Briefcase size={14} className="text-cyan-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-zinc-300">Eligible Departments</p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {elig.departments.map(d => (
                        <span key={d} className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">{d}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {(elig.minYear || elig.maxYear) && (
                <div className="flex items-start gap-3 p-3 rounded-xl border border-zinc-800/60 bg-zinc-900/30">
                  <Target size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-zinc-300">Year of Study</p>
                    <p className="text-sm text-zinc-400 mt-0.5">
                      {elig.minYear && elig.maxYear
                        ? `Year ${elig.minYear} – ${elig.maxYear}`
                        : elig.minYear
                        ? `Year ${elig.minYear} and above`
                        : `Up to Year ${elig.maxYear}`}
                    </p>
                  </div>
                </div>
              )}

              {!deadline && !elig.departments?.length && !elig.minYear && !elig.maxYear && (
                <div className="text-center py-8 text-zinc-600 text-sm">
                  No specific eligibility criteria set for this drive.
                </div>
              )}
            </div>
          )}

          {/* AI Gap Analysis tab */}
          {tab === "analysis" && (
            <div>
              {!analysis && !analysing && (
                <div className="flex flex-col items-center py-8 gap-4 text-center">
                  <div className="p-3 rounded-2xl bg-violet-500/10 border border-violet-500/20">
                    <Robot size={24} className="text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-200">AI Resume Gap Analysis</p>
                    <p className="text-xs text-zinc-500 mt-1 max-w-xs leading-relaxed">
                      We'll compare your uploaded resume against this drive's JD and required skills — identifying gaps, missing skills, and format issues.
                    </p>
                  </div>
                  <button
                    onClick={runAnalysis}
                    className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
                  >
                    <Sparkle size={14} weight="bold" /> Run Gap Analysis
                  </button>
                  {analysisErr && (
                    <p className="text-xs text-rose-400 max-w-xs">{analysisErr}</p>
                  )}
                </div>
              )}

              {analysing && (
                <div className="flex flex-col items-center gap-3 py-10">
                  <CircleNotch size={28} className="text-violet-400 animate-spin" />
                  <p className="text-sm text-zinc-500">Analysing your resume against this drive…</p>
                </div>
              )}

              {analysis && (() => {
                const readiness = analysis.overallReadiness || {};
                const score     = readiness.score ?? null;
                const scoreC    = score >= 70 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-rose-400";
                const skillGaps = analysis.skillGaps || [];
                const upgrades  = analysis.existingProjectUpgrades || [];
                const newProjs  = analysis.newProjectSuggestions || [];
                const ghSugg    = analysis.githubSuggestions || [];
                const bullets   = analysis.resumeBullets || [];
                const keySkills = analysis.jdSummary?.keySkills || [];
                const quickWins = readiness.quickWins || [];

                return (
                  <div className="space-y-4">
                    {/* Score + summary */}
                    <div className="flex items-center gap-4 p-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40">
                      {score != null && (
                        <div className="shrink-0 text-center w-16">
                          <p className={`text-3xl font-bold tabular-nums ${scoreC}`}>{score}%</p>
                          <p className="text-[9px] text-zinc-600 mt-0.5 uppercase tracking-widest">Readiness</p>
                        </div>
                      )}
                      {readiness.summary && (
                        <p className="text-xs text-zinc-400 leading-relaxed flex-1">{readiness.summary}</p>
                      )}
                    </div>

                    {/* Quick wins */}
                    {quickWins.length > 0 && (
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                        <p className="text-[9px] uppercase tracking-widest text-amber-500 mb-2">Quick Wins This Week</p>
                        <ul className="space-y-1">
                          {quickWins.map((w, i) => (
                            <li key={i} className="text-xs text-zinc-300 flex gap-2">
                              <span className="text-amber-500 shrink-0">·</span>{w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Skill gaps */}
                    {skillGaps.length > 0 && (
                      <div>
                        <p className="text-[9px] uppercase tracking-widest text-zinc-600 mb-2">Skill Gaps to Close</p>
                        <div className="space-y-2">
                          {skillGaps.map((g, i) => (
                            <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl border border-zinc-800/60 bg-zinc-900/30">
                              <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded border mt-0.5 capitalize font-semibold ${
                                g.priority === "high"   ? "border-rose-500/30 text-rose-400 bg-rose-500/10"
                                : g.priority === "medium" ? "border-amber-500/30 text-amber-400 bg-amber-500/10"
                                : "border-zinc-700 text-zinc-500"
                              }`}>{g.priority}</span>
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-zinc-200">{g.skill}</p>
                                {g.howToLearn && <p className="text-[11px] text-zinc-500 mt-0.5">{g.howToLearn}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Key skills required */}
                    {keySkills.length > 0 && (
                      <div>
                        <p className="text-[9px] uppercase tracking-widest text-zinc-600 mb-2">JD Requires</p>
                        <div className="flex flex-wrap gap-1.5">
                          {keySkills.map(s => (
                            <span key={s} className="text-[10px] px-2 py-0.5 rounded border border-violet-500/20 text-violet-300 bg-violet-500/5">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Project upgrades */}
                    {upgrades.length > 0 && (
                      <div>
                        <p className="text-[9px] uppercase tracking-widest text-zinc-600 mb-2">Upgrade Existing Projects</p>
                        <div className="space-y-2">
                          {upgrades.map((u, i) => (
                            <div key={i} className="p-3 rounded-xl border border-zinc-800/60 bg-zinc-900/30">
                              <p className="text-xs font-semibold text-cyan-400">{u.project}</p>
                              <p className="text-xs text-zinc-300 mt-1">{u.upgrade}</p>
                              {u.benefit && <p className="text-[11px] text-zinc-600 mt-0.5">{u.benefit}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* New project suggestions */}
                    {newProjs.length > 0 && (
                      <div>
                        <p className="text-[9px] uppercase tracking-widest text-zinc-600 mb-2">New Projects to Build</p>
                        <div className="space-y-2">
                          {newProjs.map((p, i) => (
                            <div key={i} className="p-3 rounded-xl border border-zinc-800/60 bg-zinc-900/30">
                              <p className="text-xs text-zinc-300">{p.suggestion}</p>
                              {p.relevance && <p className="text-[11px] text-zinc-600 mt-0.5">{p.relevance}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Resume bullets */}
                    {bullets.length > 0 && (
                      <div>
                        <p className="text-[9px] uppercase tracking-widest text-zinc-600 mb-2">Stronger Resume Bullets</p>
                        <div className="space-y-1.5">
                          {bullets.map((b, i) => (
                            <p key={i} className="text-xs text-zinc-400 pl-3 border-l-2 border-violet-500/30 leading-relaxed">{b}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* GitHub suggestions */}
                    {ghSugg.length > 0 && (
                      <div>
                        <p className="text-[9px] uppercase tracking-widest text-zinc-600 mb-2">GitHub Actions</p>
                        <div className="space-y-1.5">
                          {ghSugg.map((g, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs">
                              <span className="text-emerald-500 shrink-0 mt-0.5">·</span>
                              <span className="text-zinc-400">{g.action}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <button onClick={runAnalysis} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
                      Re-run analysis
                    </button>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-zinc-800/60 flex items-center justify-between gap-3 shrink-0">
          <button onClick={onClose} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
            Close
          </button>
          {done ? (
            <div className="flex items-center gap-1.5 text-sm text-emerald-500 font-medium">
              <CheckCircle size={14} weight="fill" /> Application submitted
            </div>
          ) : (
            <button
              onClick={handleApply}
              disabled={applying}
              className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 rounded-xl text-sm text-white font-semibold transition-colors"
            >
              {applying ? <CircleNotch size={14} className="animate-spin" /> : <Briefcase size={14} />}
              {applying ? "Submitting…" : "Apply Now"}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
