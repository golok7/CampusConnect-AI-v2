import { motion } from "framer-motion";
import { memo } from "react";
import DomainCard from "./DomainCard.jsx";

export default memo(function DomainIntelligence({ profile }) {
  const { domainEvidence, normalizedSkills = [], githubUsername } = profile;

  if (!domainEvidence) return null;

  const { topDomains = [], domainEvidence: evidence = {} } = domainEvidence;

  // Filter to domains that actually appear in topDomains (in order)
  const domains = topDomains.filter((d) => d !== "_topRepos" && evidence[d]);

  if (domains.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-3 mb-5">
        <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-medium">
          Engineering Focus
        </p>
        <div className="flex-1 h-px bg-zinc-800/60" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {domains.map((domain, index) => (
          <motion.div
            key={domain}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: index * 0.07 }}
          >
            <DomainCard
              domain={domain}
              topRepos={evidence[domain]?.topRepos || []}
              normalizedSkills={normalizedSkills}
              topDomainData={profile.topDomains?.find((d) => d.domain === domain)}
              githubUsername={githubUsername}
            />
          </motion.div>
        ))}
      </div>
    </section>
  );
});
