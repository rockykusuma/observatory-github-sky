import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { searchTopRepos, daysAgo, formatStars, LANGUAGES, LANGUAGE_COLORS } from "../api";

const WINDOWS = [
  { id: "day", label: "Tonight", days: 2, note: "repos born in the last 48 hours" },
  { id: "week", label: "This Week", days: 7, note: "repos born in the last 7 days" },
  { id: "month", label: "This Month", days: 30, note: "repos born in the last 30 days" },
  { id: "year", label: "This Year", days: 365, note: "repos born in the last 365 days" },
];

// Star magnitude flavor: brighter stars have lower magnitude, like real astronomy.
const magnitude = (rank) => `mag ${(rank * 0.4 + 0.6).toFixed(1)}`;

export default function Leaderboard() {
  const [win, setWin] = useState(WINDOWS[1]);
  const [language, setLanguage] = useState("all");
  const [repos, setRepos] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setRepos(null);
    setError(null);
    searchTopRepos({ from: daysAgo(win.days), language, perPage: 10 })
      .then(setRepos)
      .catch((e) => setError(e.message));
  }, [win, language]);

  return (
    <section className="section" id="constellations">
      <div className="section-head">
        <h2 className="section-title">Newborn Stars</h2>
        <span className="section-note">{win.note}</span>
      </div>
      <p className="section-lede">
        Stars that only just ignited — the brightest repositories born in each
        window, ranked by total light gathered. Astronomers measure brilliance
        in magnitude: the lower, the brighter.
      </p>

      <div className="controls">
        <div className="tabs">
          {WINDOWS.map((w) => (
            <button
              key={w.id}
              className={`tab ${w.id === win.id ? "active" : ""}`}
              onClick={() => setWin(w)}
            >
              {w.id === win.id && (
                <motion.span
                  className="tab-pill"
                  layoutId="tab-pill"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              {w.label}
            </button>
          ))}
        </div>
        <select className="select" value={language} onChange={(e) => setLanguage(e.target.value)}>
          {LANGUAGES.map((l) => (
            <option key={l} value={l}>
              {l === "all" ? "every language" : l}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="state">
          <span className="big">☁</span>
          Cloudy skies — rate limit reached. Give it a minute, then look again.
        </div>
      )}
      {!repos && !error && (
        <div className="state pulse">
          <span className="big">✦</span>
          Scanning the sky…
        </div>
      )}

      <AnimatePresence mode="popLayout">
        {repos && (
          <motion.div className="constellation" key={win.id + language}>
            {repos.map((r, i) => (
              <motion.a
                key={r.id}
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className={`repo-row rank-${i + 1}`}
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              >
                <span className="rank-orb">
                  <span className="rank-num">{i === 0 ? "✦1" : `${i + 1}`}</span>
                  <span className="rank-mag">{magnitude(i + 1)}</span>
                </span>
                <img className="repo-avatar" src={r.avatar} alt="" loading="lazy" />
                <span className="repo-main">
                  <span className="repo-name">
                    <span className="owner">{r.owner} / </span>
                    {r.name}
                  </span>
                  {r.description && <span className="repo-desc">{r.description}</span>}
                  <span className="repo-meta">
                    {r.language && (
                      <>
                        <span
                          className="lang-dot"
                          style={{ background: LANGUAGE_COLORS[r.language] ?? "#8b949e" }}
                        />
                        <span className="lang-name">{r.language}</span>
                      </>
                    )}
                  </span>
                </span>
                <span className="repo-stars">
                  <span className="count">★ {formatStars(r.stars)}</span>
                  <span className="unit">luminosity</span>
                </span>
              </motion.a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
