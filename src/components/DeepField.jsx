import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { searchDeepField, formatStars, LANGUAGES, LANGUAGE_COLORS } from "../api";

// Hubble stared at an empty patch of sky and found galaxies. We stare at
// repos too faint for the trending page and score them on substance:
//   · fork/star ratio — people BUILDING on it, not just admiring it
//   · push freshness  — the author is still at the bench
//   · issue traffic   — users actually run the thing
// High score + low luminosity = a gem worth a look before everyone else.

const dayssince = (t) => (Date.now() - new Date(t)) / 864e5;

function gemScore(r) {
  const forkDepth = r.forks / Math.max(1, r.stars); // typically 0.02–0.3
  const freshness = Math.max(0, 1 - dayssince(r.pushedAt) / 14); // 0..1
  const traffic = Math.min(1, (r.openIssues ?? 0) / 15); // 0..1
  return forkDepth * 6 + freshness * 1.5 + traffic;
}

function looksReal(r) {
  if (!r.description) return false; // unlabeled plate
  if (r.forks < 3) return false; // nobody's building on it yet
  if (dayssince(r.pushedAt) > 21) return false; // gone dark
  return true;
}

export default function DeepField() {
  const [language, setLanguage] = useState("all");
  const [pool, setPool] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let dead = false;
    setPool(null);
    setError(null);
    searchDeepField({ language })
      .then((items) => !dead && setPool(items))
      .catch(() => !dead && setError(true));
    return () => { dead = true; };
  }, [language]);

  const gems = useMemo(() => {
    if (!pool) return null;
    return pool
      .filter(looksReal)
      .map((r) => ({ ...r, score: gemScore(r) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [pool]);

  return (
    <section className="section" id="deep-field">
      <div className="section-head">
        <h2 className="section-title">Deep Field</h2>
        <span className="section-note">faint objects · long exposure</span>
      </div>
      <p className="section-lede">
        Point at a dark patch of sky and expose for a long time. These repositories
        are under 400 stars and under 90 days old — too faint for trending — but
        their signal is strong: heavy fork activity, live commits, real users
        filing issues. Gems, before the crowd arrives.
      </p>

      <div className="controls">
        <select className="select" value={language} onChange={(e) => setLanguage(e.target.value)}>
          {LANGUAGES.map((l) => (
            <option key={l} value={l}>{l === "all" ? "every spectrum" : l}</option>
          ))}
        </select>
      </div>

      <div className="telescope">
        {error && (
          <div className="state">
            <span className="big">☁</span>
            Long exposure interrupted — rate limit. Try again in a minute.
          </div>
        )}
        {!gems && !error && (
          <div className="state pulse">
            <span className="big">🌌</span>
            Exposing the plate… faint objects take time.
          </div>
        )}
        {gems && gems.length === 0 && (
          <div className="state">
            <span className="big">🌑</span>
            Nothing resolves in this spectrum tonight — try another.
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {gems &&
            gems.map((r, i) => (
              <motion.a
                key={r.id}
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className="repo-row df-row"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
              >
                <span className="df-signal" title="signal strength: fork depth + freshness + issue traffic">
                  <span className="df-bars">
                    {[0.6, 1.2, 1.8, 2.4].map((t, j) => (
                      <span key={j} className={`df-bar ${r.score >= t ? "lit" : ""}`} />
                    ))}
                  </span>
                  <span className="df-signal-label">signal</span>
                </span>
                <img className="repo-avatar" src={r.avatar} alt="" loading="lazy" />
                <span className="repo-main">
                  <span className="repo-name">
                    <span className="owner">{r.owner} / </span>{r.name}
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
                    <span className="df-meta">
                      {(r.forks / Math.max(1, r.stars) * 100).toFixed(0)}% fork depth
                      · pushed {Math.max(0, Math.round(dayssince(r.pushedAt)))}d ago
                      · {Math.round(dayssince(r.createdAt))}d old
                    </span>
                  </span>
                </span>
                <span className="repo-stars">
                  <span className="count">★ {formatStars(r.stars)}</span>
                  <span className="unit">⑂ {formatStars(r.forks)} forks</span>
                </span>
              </motion.a>
            ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
