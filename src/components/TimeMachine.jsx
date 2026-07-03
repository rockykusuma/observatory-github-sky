import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { searchTopRepos, monthWindow, formatStars, LANGUAGE_COLORS } from "../api";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MEDALS = ["🥇", "🥈", "🥉"];

export default function TimeMachine() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear() - 5);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [repos, setRepos] = useState(null);
  const [error, setError] = useState(null);

  const years = useMemo(() => {
    const list = [];
    for (let y = now.getFullYear(); y >= 2008; y--) list.push(y);
    return list;
  }, []);

  const isPast =
    year < now.getFullYear() ||
    (year === now.getFullYear() && month < now.getMonth() + 1);

  useEffect(() => {
    setRepos(null);
    setError(null);
    const { from, to } = monthWindow(year, month);
    // Past months never change — cache forever.
    searchTopRepos({ from, to, perPage: 8, ttlMs: isPast ? Infinity : 30 * 60 * 1000 })
      .then(setRepos)
      .catch((e) => setError(e.message));
  }, [year, month]);

  const lightYears = now.getFullYear() - year + (now.getMonth() + 1 - month) / 12;

  return (
    <section className="section" id="telescope">
      <div className="section-head">
        <h2 className="section-title">The Telescope</h2>
        <span className="section-note">archive · 2008 → today</span>
      </div>
      <p className="section-lede">
        Light takes time to travel. Point the telescope at any month since GitHub's
        birth and see whose stars were shining — the champions history already
        crowned. GitHub itself won't show you this.
      </p>

      <div className="telescope">
        <div className="telescope-dials">
          <select className="select" value={month} onChange={(e) => setMonth(+e.target.value)}>
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <select className="select" value={year} onChange={(e) => setYear(+e.target.value)}>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <p className="lightyears">
          {lightYears > 0.05 ? (
            <>
              observing light from <span className="gold">{lightYears.toFixed(1)} years ago</span>
            </>
          ) : (
            <>observing the present sky</>
          )}
        </p>

        {error && (
          <div className="state">
            <span className="big">☁</span>
            Cloudy skies — rate limit reached. The telescope needs a minute.
          </div>
        )}
        {!repos && !error && (
          <div className="state pulse">
            <span className="big">🔭</span>
            Turning the great dial to {MONTHS[month - 1]} {year}…
          </div>
        )}

        <AnimatePresence mode="wait">
          {repos && repos.length > 0 && (
            <motion.div key={`${year}-${month}`}>
              <div className="podium">
                {[repos[1], repos[0], repos[2]]
                  .filter(Boolean)
                  .map((r) => {
                    const rank = repos.indexOf(r);
                    return (
                      <motion.a
                        key={r.id}
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        className={`podium-card p${rank + 1}`}
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.6,
                          delay: rank === 0 ? 0.25 : rank === 1 ? 0.1 : 0.4,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                      >
                        <div className="podium-medal">{MEDALS[rank]}</div>
                        <img className="podium-avatar" src={r.avatar} alt="" loading="lazy" />
                        <div className="podium-name">{r.name}</div>
                        <div className="podium-owner">{r.owner}</div>
                        <div className="podium-stars">★ {formatStars(r.stars)}</div>
                      </motion.a>
                    );
                  })}
              </div>

              <div className="constellation">
                {repos.slice(3).map((r, i) => (
                  <motion.a
                    key={r.id}
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="repo-row"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.5 + i * 0.06 }}
                  >
                    <span className="rank-orb">
                      <span className="rank-num">{i + 4}</span>
                      <span className="rank-mag">mag {((i + 4) * 0.4 + 0.6).toFixed(1)}</span>
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {repos && repos.length === 0 && (
          <div className="state">
            <span className="big">🌑</span>
            An empty patch of sky — no stars formed here.
          </div>
        )}
      </div>
    </section>
  );
}
