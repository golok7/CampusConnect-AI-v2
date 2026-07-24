import { useState } from "react";
import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";

function PrimaryChip({ skill }) {
  return (
    <span className="inline-flex items-center text-xs font-medium text-zinc-300 bg-zinc-800/80 border border-zinc-700/50 px-2.5 py-1 rounded-md capitalize hover:border-zinc-600 hover:text-zinc-200 transition-colors">
      {skill}
    </span>
  );
}

function CategorySection({ label, skills }) {
  if (!skills?.length) return null;
  return (
    <div>
      <p className="text-[10px] text-zinc-700 uppercase tracking-widest mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1">
        {skills.map((s) => (
          <span
            key={s}
            className="text-[10px] text-zinc-500 bg-zinc-900 border border-zinc-800/80 px-2 py-0.5 rounded"
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

export default memo(function SkillsPanel({ skillEvidence }) {
  const [expanded, setExpanded] = useState(false);

  if (!skillEvidence) return null;

  const { strongest = [], byCategory = {}, counts = {} } = skillEvidence;
  const totalSkills = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.15 }}
    >
      <div className="flex items-center gap-3 mb-4">
        <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-medium">
          Core Skills
        </p>
        <div className="flex-1 h-px bg-zinc-800/60" />
      </div>

      {strongest.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {strongest.map((skill) => (
            <PrimaryChip key={skill} skill={skill} />
          ))}
        </div>
      )}

      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors mb-3"
      >
        <span>{expanded ? "Collapse" : `All ${totalSkills} skills`}</span>
        <span className={`transition-transform duration-200 text-[10px] ${expanded ? "rotate-180" : ""}`}>↓</span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden space-y-4"
          >
            <CategorySection label="Languages"  skills={byCategory.languages}  />
            <CategorySection label="Frameworks" skills={byCategory.frameworks} />
            <CategorySection label="Libraries"  skills={byCategory.libraries}  />
            <CategorySection label="Databases"  skills={byCategory.databases}  />
            <CategorySection label="Tools"      skills={byCategory.tools}      />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
});
