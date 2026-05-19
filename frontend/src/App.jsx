import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext.jsx";
import Navbar from "./components/layout/Navbar.jsx";
import ProtectedRoute from "./components/layout/ProtectedRoute.jsx";

// Auth pages
import LoginPage    from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";

// Shared pages
import ExplorePage      from "./pages/ExplorePage.jsx";
import ProfilePage      from "./pages/ProfilePage.jsx";
import LeaderboardPage  from "./pages/LeaderboardPage.jsx";
import AnalyticsPage    from "./pages/AnalyticsPage.jsx";

// Student pages
import StudentDashboard  from "./pages/StudentDashboard.jsx";
import MockInterviewPage from "./pages/MockInterviewPage.jsx";
import JobsPage          from "./pages/JobsPage.jsx";
import ResumePage        from "./pages/ResumePage.jsx";

// Recruiter pages
import RecruiterDashboard from "./pages/RecruiterDashboard.jsx";
import DrivePage          from "./pages/DrivePage.jsx";

const AUTH_ROUTES = ["/login", "/register"];

function Layout({ children }) {
  const location = useLocation();
  const isAuthRoute = AUTH_ROUTES.includes(location.pathname);
  return (
    <>
      {!isAuthRoute && <Navbar />}
      <main>{children}</main>
    </>
  );
}

function RootRedirect() {
  const { isAuth, user } = useAuth();
  if (!isAuth) return <Navigate to="/register" replace />;
  return <Navigate to={user?.role === "recruiter" ? "/recruiter" : "/dashboard"} replace />;
}

function NotFoundPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const home = user?.role === "recruiter" ? "/recruiter" : "/dashboard";
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-6xl font-bold text-zinc-800">404</p>
      <p className="text-lg font-semibold text-zinc-300">Page not found</p>
      <p className="text-sm text-zinc-600 max-w-xs">This page doesn't exist or you don't have access to it.</p>
      <div className="flex items-center gap-3 mt-2">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 rounded-lg border border-zinc-800 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors"
        >
          ← Go back
        </button>
        <button
          onClick={() => navigate(home, { replace: true })}
          className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 transition-colors"
        >
          Go to dashboard
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Layout>
      <Routes>
        {/* Public */}
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Root → role-based redirect */}
        <Route path="/" element={<RootRedirect />} />

        {/* Student routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>
        } />
        <Route path="/interview" element={
          <ProtectedRoute><MockInterviewPage /></ProtectedRoute>
        } />
        <Route path="/jobs" element={
          <ProtectedRoute><JobsPage /></ProtectedRoute>
        } />
        <Route path="/resume" element={
          <ProtectedRoute><ResumePage /></ProtectedRoute>
        } />

        {/* Recruiter routes */}
        <Route path="/recruiter" element={
          <ProtectedRoute role="recruiter"><RecruiterDashboard /></ProtectedRoute>
        } />
        <Route path="/drives" element={
          <ProtectedRoute role="recruiter"><RecruiterDashboard /></ProtectedRoute>
        } />
        <Route path="/drives/:id" element={
          <ProtectedRoute role="recruiter"><DrivePage /></ProtectedRoute>
        } />

        {/* Shared routes */}
        <Route path="/explore" element={
          <ProtectedRoute><ExplorePage /></ProtectedRoute>
        } />
        <Route path="/profile/:githubUsername" element={
          <ProtectedRoute><ProfilePage /></ProtectedRoute>
        } />
        <Route path="/leaderboard" element={
          <ProtectedRoute><LeaderboardPage /></ProtectedRoute>
        } />
        <Route path="/analytics" element={
          <ProtectedRoute><AnalyticsPage /></ProtectedRoute>
        } />

        {/* Authenticated 404 */}
        <Route path="*" element={
          <ProtectedRoute><NotFoundPage /></ProtectedRoute>
        } />
      </Routes>
    </Layout>
  );
}
