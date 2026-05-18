import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext.jsx";
import { authApi } from "../services/api.js";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = location.state?.from?.pathname || null;

  const [form, setForm]   = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await authApi.login(form.email.trim(), form.password);
      login(data.token, data.user);
      const role = data.user?.role || "student";
      const dest = from || (role === "recruiter" ? "/recruiter" : "/dashboard");
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-zinc-950 flex">

      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[44%] bg-zinc-900/50 border-r border-zinc-800/60 p-12">
        <div>
          <span className="text-sm font-semibold tracking-tight text-zinc-100">
            Campus<span className="text-emerald-400">Connect</span> AI
          </span>
        </div>
        <div className="space-y-6">
          <p className="text-3xl font-semibold tracking-tight text-zinc-100 leading-snug">
            Rank candidates by<br />
            <span className="text-emerald-400">intelligence,</span> not keywords.
          </p>
          <div className="space-y-3">
            {[
              "Semantic GitHub analysis across 17 domains",
              "AI mock interviews with adaptive difficulty",
              "Resume intelligence matched to live JDs",
            ].map(t => (
              <div key={t} className="flex items-start gap-2.5 text-sm text-zinc-400">
                <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                {t}
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-zinc-700">CampusConnect AI &copy; 2025</p>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm"
        >
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Sign in</h1>
            <p className="text-sm text-zinc-500 mt-1">
              No account?{" "}
              <Link to="/register" className="text-emerald-400 hover:text-emerald-300 transition-colors">
                Create one
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400 font-medium">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="you@college.edu"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400 font-medium">Password</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60 transition-colors"
              />
            </div>

            {error && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-lg transition-colors active:scale-[0.98]"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
