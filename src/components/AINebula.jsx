import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { searchAIRepos, AI_MODES, formatStars, LANGUAGE_COLORS } from "../api";

export default function AINebula() {
  const [mode, setMode] = useState(AI_MODES[0]);
  const [repos, setRepos] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setRepos(null);
    setError(null);
    searchAIRepos({ mode: mode.id, perPage: 12 })
      .then(setRepos)
      .catch((e) => setError(e.message));
  }, [mode]);

  return (
    <section className="section" id="ai-nebula">
      <div className="section-head">
        <h2 className="section-title">The AI Nebula</h2>
        <span className="section-note">◈ intelligence, gathering</span>
      </div>
      <p className="section-lede">
        The densest cloud in tonight's sky. Large language models, agents, neural
        nets — the repositories bending the whole galaxy toward machine
        intelligence, ranked by the light they've gathered.
      </p>

      <div className="controls">
        <div className="tabs">
          {AI_MODES.map((m) => (
            <button
              key={m.id}
              className={`tab ${m.id === mode.id ? "active" : ""}`}
              onClick={() => setMode(m)}
            >
              {m.id === mode.id && (
                <motion.span
                  className="tab-pill nebula"
                  layoutId="ai-pill"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              {m.label}
            </button>
          ))}
        </div>
        <span className="section-note">{mode.note}</span>
      </div>

      {error && (
        <div className="state">
          <span className="big">☁</span>
          Cloudy skies — GitHub's search rate limit. Give it a minute, then look again.
        </div>
      )}
      {!repos && !error && (
        <div className="state pulse">
          <span className="big">✦</span>
          Charting the nebula…
        </div>
      )}

      <AnimatePresence mode="popLayout">
        {repos && (
          <motion.div className="constellation" key={mode.id}>
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
                transition={{ duration: 0.45, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
              >
                <span className="rank-orb">
                  <span className="rank-num">{i === 0 ? "✦1" : `${i + 1}`}</span>
                  <span className="rank-mag">{i === 0 ? "core" : "★"}</span>
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
                    {mode.days && r.createdAt && (
                      <span className="lang-name">· born {r.createdAt.slice(0, 4)}</span>
                    )}
                    {r.topics?.slice(0, 2).map((t) => (
                      <span key={t} className="topic-chip">
                        {t}
                      </span>
                    ))}
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
