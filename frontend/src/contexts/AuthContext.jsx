import { createContext, useContext, useState, useEffect, useCallback } from "react";

const AuthContext = createContext(null);

export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE !== "false";
const API_BASE = import.meta.env.VITE_API_URL || "";

// Drop any stale non-recruiter session so demo mode always shows the recruiter view.
if (DEMO_MODE) {
  try {
    const t = localStorage.getItem("cc_token");
    const role = t && JSON.parse(atob(t.split(".")[1])).role;
    if (t && role !== "recruiter") localStorage.removeItem("cc_token");
  } catch { localStorage.removeItem("cc_token"); }
}

function decodeToken(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("cc_token") || null);
  const [user, setUser]   = useState(() => {
    const t = localStorage.getItem("cc_token");
    return t ? decodeToken(t) : null;
  });

  const login = useCallback((newToken, userData) => {
    localStorage.setItem("cc_token", newToken);
    setToken(newToken);
    setUser(userData || decodeToken(newToken));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("cc_token");
    setToken(null);
    setUser(null);
  }, []);

  // Auto-logout on token expiry
  useEffect(() => {
    if (!token) return;
    const payload = decodeToken(token);
    if (!payload?.exp) return;
    const msLeft = payload.exp * 1000 - Date.now();
    if (msLeft <= 0) { logout(); return; }
    const timer = setTimeout(logout, msLeft);
    return () => clearTimeout(timer);
  }, [token, logout]);

  // ── Demo mode: sign-in disabled, auto-enter as a recruiter ─────────────────
  // Set VITE_DEMO_MODE=false (and DEMO_MODE=false on the backend) to restore sign-in.
  const [demoLoading, setDemoLoading] = useState(DEMO_MODE && !localStorage.getItem("cc_token"));
  const [demoError, setDemoError] = useState(false);
  useEffect(() => {
    if (!DEMO_MODE || token) return;
    let cancelled = false;
    (async () => {
      try {
        // Render free tier may be asleep; allow a long first request.
        const res = await fetch(`${API_BASE}/auth/demo`, { method: "POST" });
        if (!res.ok) throw new Error("demo unavailable");
        const data = await res.json();
        if (!cancelled) login(data.token, { id: data.user?.id, role: "recruiter", name: data.user?.name });
      } catch {
        if (!cancelled) setDemoError(true);
      } finally {
        if (!cancelled) setDemoLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token, login]);

  if (DEMO_MODE && demoLoading) {
    return (
      <div style={{ minHeight: "100vh", background: "#09090b", color: "#a1a1aa", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
        Loading recruiter demo… (the server may take up to a minute to wake up)
      </div>
    );
  }
  if (DEMO_MODE && demoError && !token) {
    return (
      <div style={{ minHeight: "100vh", background: "#09090b", color: "#a1a1aa", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
        Demo server is waking up. Please refresh in a few seconds.
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuth: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
