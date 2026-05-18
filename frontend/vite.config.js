import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const BACKEND = "http://localhost:5000";

// All backend route prefixes
const backendRoutes = [
  "/auth", "/user", "/users", "/github", "/resume",
  "/search", "/recommend", "/jobs", "/drives", "/pipeline",
  "/interview", "/analytics", "/leaderboard", "/admin",
  "/api/ontology", "/pipeline",
];

// Only proxy actual API fetch calls — not browser navigations (which send Accept: text/html)
function apiOnly(req) {
  if (req.headers.accept?.includes("text/html")) return "/index.html";
}

const proxy = Object.fromEntries(
  backendRoutes.map(route => [
    route,
    { target: BACKEND, changeOrigin: true, bypass: apiOnly },
  ])
);

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy,
  },
});
