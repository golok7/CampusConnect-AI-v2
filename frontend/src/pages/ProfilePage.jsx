import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { profileApi } from "../services/api.js";
import ProfileHero from "../components/profile/ProfileHero.jsx";
import DomainIntelligence from "../components/profile/DomainIntelligence.jsx";
import SkillsPanel from "../components/profile/SkillsPanel.jsx";
import RepositoryEvidence from "../components/profile/RepositoryEvidence.jsx";
import ContributionDepth from "../components/profile/ContributionDepth.jsx";

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-5 h-5 rounded-full border border-zinc-700 border-t-zinc-400 animate-spin" />
    </div>
  );
}

function TokenGate({ onToken }) {
  const [val, setVal] = useState("");
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4">Authentication required</p>
        <input
          type="text"
          placeholder="Paste your JWT token"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 font-mono mb-3"
        />
        <button
          onClick={() => {
            if (val.trim()) {
              localStorage.setItem("cc_token", val.trim());
              onToken();
            }
          }}
          className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm py-2.5 rounded-lg transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function UsernameBar({ current }) {
  const navigate = useNavigate();
  const [val, setVal] = useState(current);

  function go(e) {
    e.preventDefault();
    const u = val.trim();
    if (u && u !== current) navigate(`/profile/${u}`);
  }

  return (
    <div className="border-b border-zinc-800/60 bg-zinc-950/90 backdrop-blur sticky top-0 z-10">
      <form
        onSubmit={go}
        className="max-w-5xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-2"
      >
        <button
          type="button"
          onClick={() => navigate("/")}
          className="text-xs text-zinc-600 font-mono shrink-0 hover:text-zinc-400 transition-colors"
        >
          CampusConnect
        </button>
        <span className="text-zinc-800">/</span>
        <span className="text-xs text-zinc-700 font-mono shrink-0">profile /</span>
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="username"
          className="flex-1 bg-transparent text-sm text-zinc-300 font-mono placeholder-zinc-700 focus:outline-none"
        />
        <button
          type="submit"
          className="text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-600 px-3 py-1 rounded-md transition-colors shrink-0"
        >
          Go →
        </button>
      </form>
    </div>
  );
}

export default function ProfilePage() {
  const { githubUsername } = useParams();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsToken, setNeedsToken] = useState(!localStorage.getItem("cc_token"));

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await profileApi.get(githubUsername);
      setProfile(data);
    } catch (err) {
      if (err.status === 401) {
        localStorage.removeItem("cc_token");
        setNeedsToken(true);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!needsToken) load();
  }, [githubUsername, needsToken]);

  if (needsToken) return <TokenGate onToken={() => { setNeedsToken(false); }} />;
  if (loading) return <Spinner />;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-500 text-sm mb-1">Could not load profile</p>
          <p className="text-zinc-600 text-xs font-mono">{error}</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-zinc-950">
      <UsernameBar current={githubUsername} />
      <ProfileHero profile={profile} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-20 space-y-10 mt-10">
        <DomainIntelligence profile={profile} />

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2">
            <SkillsPanel skillEvidence={profile.skillEvidence} />
          </div>
          <div className="lg:col-span-3">
            <RepositoryEvidence topRepos={profile.contributionStats.topRepos} />
          </div>
        </div>

        <ContributionDepth contributionStats={profile.contributionStats} />
      </div>
    </div>
  );
}
