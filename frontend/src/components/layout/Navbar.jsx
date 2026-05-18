import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext.jsx";
import {
  HouseSimple, MagnifyingGlass, Briefcase, ChartBar,
  Microphone, FileText, Trophy, SignOut, List, X,
} from "@phosphor-icons/react";

const studentLinks = [
  { to: "/dashboard",  label: "Dashboard",  Icon: HouseSimple },
  { to: "/explore",    label: "Explore",    Icon: MagnifyingGlass },
  { to: "/jobs",       label: "Jobs",       Icon: Briefcase },
  { to: "/resume",     label: "Resume",     Icon: FileText },
  { to: "/interview",  label: "Interview",  Icon: Microphone },
  { to: "/leaderboard",label: "Leaderboard",Icon: Trophy },
];

const recruiterLinks = [
  { to: "/recruiter",  label: "Dashboard",  Icon: HouseSimple },
  { to: "/explore",    label: "Explore",    Icon: MagnifyingGlass },
  { to: "/drives",     label: "Drives",     Icon: Briefcase },
  { to: "/analytics",  label: "Analytics",  Icon: ChartBar },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const links = user?.role === "recruiter" ? recruiterLinks : studentLinks;

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const baseLink = "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-zinc-400 transition-colors hover:text-zinc-100";
  const activeLink = `${baseLink} bg-zinc-800/60 text-zinc-100`;

  return (
    <nav className="sticky top-0 z-40 border-b border-zinc-800/60 bg-zinc-950/90 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 h-13 flex items-center justify-between gap-6">

        {/* Logo */}
        <NavLink to="/" className="shrink-0 text-sm font-semibold tracking-tight text-zinc-100">
          Campus<span className="text-emerald-400">Connect</span>
        </NavLink>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1 flex-1">
          {links.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => isActive ? activeLink : baseLink}
            >
              <Icon size={15} weight="duotone" />
              {label}
            </NavLink>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-xs text-zinc-600 font-mono truncate max-w-[140px]">
            {user?.email}
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <SignOut size={14} />
            <span className="hidden sm:inline">Sign out</span>
          </button>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-1.5 text-zinc-400 hover:text-zinc-100"
            onClick={() => setOpen(v => !v)}
          >
            {open ? <X size={18} /> : <List size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden border-t border-zinc-800/60 bg-zinc-950 px-4 py-3 flex flex-col gap-1">
          {links.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) => isActive ? activeLink : baseLink}
            >
              <Icon size={15} weight="duotone" />
              {label}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  );
}
