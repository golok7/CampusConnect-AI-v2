import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../contexts/AuthContext.jsx";
import { authApi } from "../services/api.js";
import { Student, Briefcase } from "@phosphor-icons/react";

const ROLES = [
  { value: "student",   label: "Student",   desc: "Build your profile, get matched",  Icon: Student },
  { value: "recruiter", label: "Recruiter", desc: "Search, rank, and hire candidates", Icon: Briefcase },
];

export default function RegisterPage() {
  const { login }   = useAuth();
  const navigate    = useNavigate();
  const [step, setStep]   = useState(1);
  const [form, setForm]   = useState({ name: "", email: "", password: "", role: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })); setError(""); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.role) { setError("Select a role to continue"); return; }
    setError(""); setLoading(true);
    try {
      const data = await authApi.register(form.name.trim(), form.email.trim(), form.password, form.role);
      login(data.token, data.user);
      navigate(form.role === "recruiter" ? "/recruiter" : "/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-zinc-950 flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <div className="mb-8">
          <span className="text-xs text-zinc-600 uppercase tracking-widest">Step {step} of 2</span>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100 mt-1">
            {step === 1 ? "Create your account" : "What brings you here?"}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Already have an account?{" "}
            <Link to="/login" className="text-emerald-400 hover:text-emerald-300 transition-colors">Sign in</Link>
          </p>
        </div>

        <form onSubmit={step === 1 ? (e) => { e.preventDefault(); setStep(2); } : handleSubmit}>
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 font-medium">Full name</label>
                  <input
                    required
                    value={form.name}
                    onChange={e => setField("name", e.target.value)}
                    placeholder="Aryan Mehta"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60 transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 font-medium">Email</label>
                  <input
                    type="email" required
                    value={form.email}
                    onChange={e => setField("email", e.target.value)}
                    placeholder="aryan@college.edu"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60 transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 font-medium">Password</label>
                  <input
                    type="password" required minLength={6}
                    value={form.password}
                    onChange={e => setField("password", e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium py-2.5 rounded-lg transition-colors active:scale-[0.98] mt-2"
                >
                  Continue
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  {ROLES.map(({ value, label, desc, Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setField("role", value)}
                      className={`text-left p-4 rounded-xl border transition-all active:scale-[0.98] ${
                        form.role === value
                          ? "border-emerald-500/60 bg-emerald-500/10"
                          : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
                      }`}
                    >
                      <Icon
                        size={22}
                        weight="duotone"
                        className={form.role === value ? "text-emerald-400" : "text-zinc-500"}
                      />
                      <p className="text-sm font-medium text-zinc-200 mt-2">{label}</p>
                      <p className="text-xs text-zinc-500 mt-0.5 leading-snug">{desc}</p>
                    </button>
                  ))}
                </div>

                {error && (
                  <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 border border-zinc-800 hover:border-zinc-700 text-zinc-400 text-sm py-2.5 rounded-lg transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !form.role}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-lg transition-colors active:scale-[0.98]"
                  >
                    {loading ? "Creating…" : "Create account"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </motion.div>
    </div>
  );
}
