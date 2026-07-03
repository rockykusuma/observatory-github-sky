import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchOfficialTrending, formatStars, LANGUAGES, LANGUAGE_COLORS } from "../api";

const PERIODS = [
  { id: "daily", label: "Today", unit: "today" },
  { id: "weekly", label: "This Week", unit: "this week" },
  { id: "monthly", label: "This Month", unit: "this month" },
];

export default function SkyChart() {
  const [period, setPeriod] = useState(PERIODS[0]);
  const [language, setLanguage] = useState("all");
  const [repos, setRepos] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setRepos(null);
    setError(null);
    fetchOfficialTrending(period.id, language)
      .then((items) => setRepos(items.slice(0, 10)))
      .catch((e) => setError(e.message));
  }, [period, language]);

  return (
    <section className="section" id="skychart">
      <div className="section-head">
        <h2 className="section-title">Tonight's Sky Chart</h2>
        <span className="section-note">GitHub's official trending · any age</span>
      </div>
      <p className="section-lede">
        The stars flaring brightest right now — old or new — ranked by the light
        they've gained {period.unit}. This is GitHub's own trending signal, the
        one the headlines quote.
      </p>

      <div className="controls">
        <div className="tabs">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              className={`tab ${p.id === period.id ? "active" : ""}`}
              onClick={() => setPeriod(p)}
            >
              {p.id === period.id && (
                <motion.span
                  className="tab-pill"
                  layoutId="skychart-pill"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              {p.label}
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
          Couldn't reach the official chart — is the dev server proxy running?
        </div>
      )}
      {!repos && !error && (
        <div className="state pulse">
          <span className="big">✦</span>
          Reading tonight's chart…
        </div>
      )}

      <AnimatePresence mode="popLayout">
        {repos && (
          <motion.div className="constellation" key={period.id + language}>
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
                  <span className="rank-mag">{i === 0 ? "flare" : "rising"}</span>
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
                    <span className="lang-name">· ★ {formatStars(r.stars)} total</span>
                  </span>
                </span>
                <span className="repo-stars">
                  <span className="count">
                    {r.gained != null ? `+${formatStars(r.gained)}` : `★ ${formatStars(r.stars)}`}
                  </span>
                  <span className="unit">stars {period.unit}</span>
                </span>
              </motion.a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
