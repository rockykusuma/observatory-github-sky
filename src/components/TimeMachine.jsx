import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { searchTopRepos, monthWindow, formatStars, LANGUAGE_COLORS } from "../api";
import { getParam, setParam, revealSection } from "../urlstate";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MEDALS = ["🥇", "🥈", "🥉"];

// Telescope lenses: filter the archive by language (colored like the rest of
// the sky) — "all" is the naked-eye view.
const LENSES = Object.keys(LANGUAGE_COLORS).sort();

// Curated topic filters. GitHub topics only became common after 2016, so the
// dial warns when pointed at older skies.
const TOPICS = [
  { value: "machine-learning", label: "Machine learning" },
  { value: "llm", label: "LLMs" },
  { value: "cli", label: "CLI tools" },
  { value: "database", label: "Databases" },
  { value: "security", label: "Security" },
  { value: "devops", label: "DevOps" },
  { value: "game-engine", label: "Game engines" },
  { value: "data-visualization", label: "Data viz" },
];

export default function TimeMachine() {
  const now = new Date();
  // Deep link: ?sky=YYYY-MM points the telescope at that month.
  const linked = /^20[0-2]\d-(0[1-9]|1[0-2])$/.test(getParam("sky") || "") ? getParam("sky") : null;
  const [year, setYear] = useState(linked ? +linked.slice(0, 4) : now.getFullYear() - 5);
  const [month, setMonth] = useState(linked ? +linked.slice(5) : now.getMonth() + 1);
  // Deep links: ?lens=Python filters by language, ?topic=machine-learning by topic.
  const [lens, setLens] = useState(() =>
    LENSES.includes(getParam("lens")) ? getParam("lens") : "all"
  );
  const [topic, setTopic] = useState(() =>
    TOPICS.some((t) => t.value === getParam("topic")) ? getParam("topic") : "all"
  );

  useEffect(() => {
    if (linked || getParam("lens") || getParam("topic")) revealSection("telescope");
  }, []);

  const retune = (y, m) => {
    setYear(y);
    setMonth(m);
    setParam("sky", `${y}-${String(m).padStart(2, "0")}`);
  };
  const swapLens = (l) => {
    setLens(l);
    setParam("lens", l === "all" ? null : l);
  };
  const tuneTopic = (t) => {
    setTopic(t);
    setParam("topic", t === "all" ? null : t);
  };
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
    // Past months never change — cache forever. (Topic tags can be added
    // retroactively, so topic-filtered views of the past get a long TTL
    // instead of Infinity.)
    const ttlMs = !isPast
      ? 30 * 60 * 1000
      : topic !== "all"
        ? 7 * 24 * 60 * 60 * 1000
        : Infinity;
    searchTopRepos({ from, to, language: lens, topic, perPage: 8, ttlMs })
      .then(setRepos)
      .catch((e) => setError(e.message));
  }, [year, month, lens, topic]);

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
          <select className="select" value={month} onChange={(e) => retune(year, +e.target.value)}>
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <select className="select" value={year} onChange={(e) => retune(+e.target.value, month)}>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            className="select"
            value={lens}
            onChange={(e) => swapLens(e.target.value)}
            aria-label="Language lens"
          >
            <option value="all">All languages</option>
            {LENSES.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <select
            className="select"
            value={topic}
            onChange={(e) => tuneTopic(e.target.value)}
            aria-label="Topic filter"
          >
            <option value="all">Whole sky</option>
            {TOPICS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        {topic !== "all" && year < 2016 && (
          <p className="section-note" style={{ marginTop: 8 }}>
            ⚠ Topic tags are sparse before 2016 — old stars often went uncatalogued.
            An empty sky here may not mean nothing was shining.
          </p>
        )}
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
            <motion.div key={`${year}-${month}-${lens}-${topic}`}>
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
            {lens !== "all" || topic !== "all"
              ? "Nothing through this lens — try widening the filter."
              : "An empty patch of sky — no stars formed here."}
          </div>
        )}
      </div>
    </section>
  );
}
