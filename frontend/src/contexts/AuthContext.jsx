import { createContext, useContext, useState, useEffect, useCallback } from "react";

const AuthContext = createContext(null);

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
