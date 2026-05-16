import { useState, useRef, useEffect } from "react";
import { DOMAIN_CONFIG } from "../../constants/domains.js";

// ── Static filter data ────────────────────────────────────────────────────────

const DOMAIN_CHIPS = Object.entries(DOMAIN_CONFIG).map(([key, cfg]) => ({
  id:    key,
  label: cfg.label,
  color: cfg.tagText,
  bg:    cfg.tagBg,
  border:cfg.tagBorder,
  dot:   cfg.dotColor,
}));

const SKILL_CHIPS = [
  "React", "Next.js", "TypeScript", "Node.js", "Express",
  "FastAPI", "Flask", "Django", "Go", "Rust",
  "Python", "C++", "Java", "PyTorch", "TensorFlow",
  "LangChain", "Docker", "Kubernetes", "AWS", "MongoDB",
  "PostgreSQL", "Redis", "GraphQL", "OpenCV", "Groq",
].map(s => ({ id: s.toLowerCase(), label: s }));

const YEAR_CHIPS = [
  { id: 1, label: "Year 1" },
  { id: 2, label: "Year 2" },
  { id: 3, label: "Year 3" },
  { id: 4, label: "Year 4" },
];

const BRANCH_CHIPS = [
  { id: "CSE",   label: "CSE"   },
  { id: "ECE",   label: "ECE"   },
  { id: "EEE",   label: "EEE"   },
  { id: "MECH",  label: "MECH"  },
  { id: "CIVIL", label: "CIVIL" },
  { id: "IT",    label: "IT"    },
];

const ACTIVITY_CHIPS = [
  { id: "high",   label: "High",   hint: ">200 score"  },
  { id: "medium", label: "Medium", hint: "80–200 score" },
  { id: "low",    label: "Low",    hint: "<80 score"   },
];

// ── Chip components ───────────────────────────────────────────────────────────

function DomainChip({ chip, selected, onToggle }) {
  return (
    <button
      onClick={() => onToggle(chip.id)}
      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border transition-all ${
        selected
          ? `${chip.bg} ${chip.color} ${chip.border} ring-1 ring-current/30`
          : "bg-zinc-800/50 text-zinc-500 border-zinc-700/60 hover:border-zinc-600 hover:text-zinc-400"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${selected ? chip.dot : "bg-zinc-600"}`} />
      {chip.label}
    </button>
  );
}

function PlainChip({ label, selected, onToggle, hint }) {
  return (
    <button
      onClick={onToggle}
      title={hint}
      className={`inline-flex items-center text-xs px-2.5 py-1 rounded-md border transition-all ${
        selected
          ? "bg-zinc-700 text-zinc-100 border-zinc-500"
          : "bg-zinc-800/50 text-zinc-500 border-zinc-700/60 hover:border-zinc-600 hover:text-zinc-400"
      }`}
    >
      {label}
    </button>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────

function SectionHead({ label, count }) {
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-medium">{label}</span>
      {count > 0 && (
        <span className="text-[10px] text-zinc-500 bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 rounded-full tabular-nums">
          {count}
        </span>
      )}
      <div className="flex-1 h-px bg-zinc-800/60" />
    </div>
  );
}

// ── Main FilterModal ──────────────────────────────────────────────────────────

export default function FilterModal({ filters, onChange, onReset, onClose, anchorRef }) {
  const { domains, skills, years, branches, activity } = filters;
  const [chipSearch, setChipSearch] = useState("");
  const modalRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handle(e) {
      if (
        modalRef.current && !modalRef.current.contains(e.target) &&
        anchorRef?.current && !anchorRef.current.contains(e.target)
      ) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onClose, anchorRef]);

  const query = chipSearch.toLowerCase();

  const visibleDomains = query
    ? DOMAIN_CHIPS.filter(c => c.label.toLowerCase().includes(query))
    : DOMAIN_CHIPS;

  const visibleSkills = query
    ? SKILL_CHIPS.filter(c => c.label.toLowerCase().includes(query))
    : SKILL_CHIPS;

  const showDomains  = visibleDomains.length > 0;
  const showSkills   = visibleSkills.length > 0;
  const showYear     = !query || "year".includes(query);
  const showBranch   = !query || "branch cse ece eee".includes(query);
  const showActivity = !query || "activity high medium low".includes(query);

  function toggle(key, id) {
    const current = filters[key];
    const next = Array.isArray(current)
      ? current.includes(id) ? current.filter(x => x !== id) : [...current, id]
      : id;
    onChange({ ...filters, [key]: next });
  }

  const totalActive = domains.length + skills.length + years.length + branches.length + (activity ? 1 : 0);

  return (
    <div
      ref={modalRef}
      className="absolute z-50 top-full mt-1.5 right-0 w-[560px] max-h-[76vh] flex flex-col
                 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl shadow-black/60 overflow-hidden"
    >
      {/* Search bar */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-zinc-800">
        <svg className="w-3.5 h-3.5 text-zinc-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          autoFocus
          value={chipSearch}
          onChange={e => setChipSearch(e.target.value)}
          placeholder="Search filters…"
          className="flex-1 bg-transparent text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none"
        />
        {chipSearch && (
          <button onClick={() => setChipSearch("")} className="text-zinc-600 hover:text-zinc-400 text-xs">✕</button>
        )}
      </div>

      {/* Scrollable chip area */}
      <div className="overflow-y-auto flex-1 px-4 py-4 space-y-5 scrollbar-thin">

        {/* Domains */}
        {showDomains && (
          <div>
            <SectionHead label="Domain" count={domains.length} />
            <div className="flex flex-wrap gap-1.5">
              {visibleDomains.map(chip => (
                <DomainChip
                  key={chip.id}
                  chip={chip}
                  selected={domains.includes(chip.id)}
                  onToggle={id => toggle("domains", id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Skills */}
        {showSkills && (
          <div>
            <SectionHead label="Skills & Frameworks" count={skills.length} />
            <div className="flex flex-wrap gap-1.5">
              {visibleSkills.map(chip => (
                <PlainChip
                  key={chip.id}
                  label={chip.label}
                  selected={skills.includes(chip.id)}
                  onToggle={() => toggle("skills", chip.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Year */}
        {showYear && (
          <div>
            <SectionHead label="Year" count={years.length} />
            <div className="flex flex-wrap gap-1.5">
              {YEAR_CHIPS.map(chip => (
                <PlainChip
                  key={chip.id}
                  label={chip.label}
                  selected={years.includes(chip.id)}
                  onToggle={() => toggle("years", chip.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Branch */}
        {showBranch && (
          <div>
            <SectionHead label="Branch" count={branches.length} />
            <div className="flex flex-wrap gap-1.5">
              {BRANCH_CHIPS.map(chip => (
                <PlainChip
                  key={chip.id}
                  label={chip.label}
                  selected={branches.includes(chip.id)}
                  onToggle={() => toggle("branches", chip.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Activity */}
        {showActivity && (
          <div>
            <SectionHead label="Activity Level" count={activity ? 1 : 0} />
            <div className="flex flex-wrap gap-1.5">
              {ACTIVITY_CHIPS.map(chip => (
                <PlainChip
                  key={chip.id}
                  label={chip.label}
                  hint={chip.hint}
                  selected={activity === chip.id}
                  onToggle={() => onChange({ ...filters, activity: activity === chip.id ? null : chip.id })}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-zinc-800 bg-zinc-900/80">
        <span className="text-[11px] text-zinc-600">
          {totalActive > 0 ? `${totalActive} filter${totalActive > 1 ? "s" : ""} active` : "No filters"}
        </span>
        <div className="flex items-center gap-2">
          {totalActive > 0 && (
            <button
              onClick={onReset}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-700 hover:border-zinc-500 px-3 py-1 rounded-md transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
