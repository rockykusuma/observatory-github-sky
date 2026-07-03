import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { searchTopRepos, formatStars } from "../api";

// Pick 3 deterministic candidate years for today's date, so every visitor
// sees the same almanac entry on a given day.
function candidateYears(date) {
  const start = 2009;
  const maxYear = date.getFullYear() - 1;
  const span = maxYear - start + 1;
  const doy = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 864e5);
  const years = new Set();
  let k = doy * 7 + 3;
  while (years.size < 3 && years.size < span) {
    years.add(start + (k % span));
    k = k * 31 + 7;
  }
  return [...years];
}

export default function Almanac() {
  const [entry, setEntry] = useState(null);

  useEffect(() => {
    const today = new Date();
    let md = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(
      today.getDate()
    ).padStart(2, "0")}`;
    if (md === "02-29") md = "02-28";

    Promise.allSettled(
      candidateYears(today).map((y) =>
        searchTopRepos({
          from: `${y}-${md}`,
          to: `${y}-${md}`,
          perPage: 1,
          ttlMs: Infinity, // the past never changes
        }).then((items) => ({ year: y, repo: items[0] }))
      )
    ).then((results) => {
      const ok = results
        .filter((r) => r.status === "fulfilled" && r.value.repo)
        .map((r) => r.value);
      if (!ok.length) return;
      ok.sort((a, b) => b.repo.stars - a.repo.stars);
      setEntry(ok[0]);
    });
  }, []);

  if (!entry) return null;
  const { year, repo } = entry;

  return (
    <motion.section
      className="almanac"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      <span className="almanac-label">From the logbook · on this night in {year}</span>
      <p className="almanac-text">
        a star named{" "}
        <a href={repo.url} target="_blank" rel="noreferrer" className="almanac-repo">
          {repo.name}
        </a>{" "}
        first ignited in the <em>{repo.owner}</em> system. Tonight it shines at{" "}
        <span className="almanac-stars">★ {formatStars(repo.stars)}</span>.
      </p>
    </motion.section>
  );
}
