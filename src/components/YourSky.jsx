import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchUser, searchRepos, formatStars, LANGUAGE_COLORS } from "../api";
import { getParam, setParam, revealSection } from "../urlstate";

// Every account is its own patch of sky. One search request (user:X sorted
// by stars) charts their brightest work as a constellation.

// Deterministic pseudo-random from a repo id — stars keep their positions.
const jitter = (seed, salt) => {
  let h = (seed * 2654435761 + salt * 40503) % 2147483647;
  h = (h * 48271) % 2147483647;
  return h / 2147483647;
};

function Constellation({ repos }) {
  const W = 640, H = 240, PAD = 40;
  const stars = useMemo(() => {
    const top = repos.slice(0, 10);
    const max = Math.max(1, ...top.map((r) => r.stars));
    return top.map((r, i) => ({
      repo: r,
      x: PAD + ((i + jitter(r.id, 1) * 0.8) / top.length) * (W - PAD * 2),
      y: PAD + jitter(r.id, 2) * (H - PAD * 2),
      r: 3 + Math.sqrt(r.stars / max) * 9,
    }));
  }, [repos]);

  return (
    <div className="yoursky-chart">
      <svg viewBox={`0 0 ${W} ${H}`} aria-label="personal constellation">
        {stars.slice(0, -1).map((s, i) => (
          <motion.line
            key={i}
            x1={s.x} y1={s.y} x2={stars[i + 1].x} y2={stars[i + 1].y}
            className="yoursky-line"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
          />
        ))}
        {stars.map((s, i) => (
          <g key={s.repo.id}>
            <motion.circle
              cx={s.x} cy={s.y} r={s.r}
              className={`yoursky-star ${i === 0 ? "brightest" : ""}`}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <title>{s.repo.name} · ★ {formatStars(s.repo.stars)}</title>
            </motion.circle>
            <text x={s.x} y={s.y - s.r - 6} className="yoursky-label" textAnchor="middle">
              {s.repo.name.length > 14 ? s.repo.name.slice(0, 13) + "…" : s.repo.name}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function YourSky() {
  const [input, setInput] = useState("");
  const [target, setTarget] = useState(() => getParam("observer") || null);
  const [user, setUser] = useState(null);
  const [repos, setRepos] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (getParam("observer")) revealSection("your-sky");
  }, []);

  useEffect(() => {
    if (!target) return;
    let dead = false;
    setUser(null);
    setRepos(null);
    setError(null);
    Promise.all([
      fetchUser(target),
      searchRepos({ q: `user:${target}`, sort: "stars", perPage: 30, ttlMs: 60 * 60 * 1000 }),
    ])
      .then(([u, rs]) => {
        if (dead) return;
        setUser(u);
        setRepos(rs.filter((r) => r.stars > 0));
      })
      .catch((e) => {
        if (dead) return;
        setError(
          e.message === "not-found"
            ? "No observer by that name in the registry."
            : "Cloudy skies — rate limit reached. Try again in a minute."
        );
      });
    return () => { dead = true; };
  }, [target]);

  const observe = (e) => {
    e.preventDefault();
    const v = input.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\/.*$/, "").replace(/^@/, "");
    if (v) {
      setTarget(v);
      setParam("observer", v);
    }
  };

  const luminosity = repos ? repos.reduce((a, r) => a + r.stars, 0) : 0;

  return (
    <section className="section" id="your-sky">
      <div className="section-head">
        <h2 className="section-title">Your Sky</h2>
        <span className="section-note">every account is a constellation</span>
      </div>
      <p className="section-lede">
        Enter any GitHub username and we chart their patch of sky: their
        repositories drawn as a constellation, brightest star first, with the
        combined luminosity of everything they've put into orbit.
      </p>

      <form className="controls" onSubmit={observe}>
        <input
          className="select eclipse-input"
          placeholder="github username"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" className="btn-planetarium">chart it</button>
      </form>

      {(target || error) && (
        <div className="telescope">
          {error && <div className="state"><span className="big">☁</span>{error}</div>}
          {target && !user && !error && (
            <div className="state pulse"><span className="big">✨</span>Charting {target}'s sky…</div>
          )}

          <AnimatePresence mode="wait">
            {user && repos && (
              <motion.div
                key={user.login}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="spectro-head">
                  <a href={user.url} target="_blank" rel="noreferrer" className="spectro-id">
                    <img className="spectro-avatar" src={user.avatar} alt="" style={{ borderRadius: "50%" }} />
                    <span>
                      <span className="spectro-name">{user.name || user.login}</span>
                      {user.bio && <span className="repo-desc">{user.bio}</span>}
                    </span>
                  </a>
                </div>

                <div className="champion-stats spectro-stats">
                  <div><span className="stat-value gold">★ {formatStars(luminosity)}</span><span className="stat-label">combined luminosity</span></div>
                  <div><span className="stat-value">{repos.length ? repos[0].name : "—"}</span><span className="stat-label">brightest star</span></div>
                  <div><span className="stat-value">{user.publicRepos}</span><span className="stat-label">bodies in orbit</span></div>
                  <div><span className="stat-value">{formatStars(user.followers)}</span><span className="stat-label">fellow observers</span></div>
                  <div><span className="stat-value">{new Date(user.createdAt).getFullYear()}</span><span className="stat-label">observing since</span></div>
                </div>

                {repos.length > 1 && <Constellation repos={repos} />}
                {repos.length === 0 && (
                  <div className="state"><span className="big">🌑</span>A dark patch — no starred bodies yet.</div>
                )}

                <div className="constellation" style={{ marginTop: 18 }}>
                  {repos.slice(0, 6).map((r, i) => (
                    <motion.a
                      key={r.id}
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="repo-row"
                      initial={{ opacity: 0, x: -14 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.35, delay: 0.4 + i * 0.06 }}
                    >
                      <span className="rank-orb">
                        <span className="rank-num">{i + 1}</span>
                        <span className="rank-mag">mag {(i * 0.4 + 1).toFixed(1)}</span>
                      </span>
                      <img className="repo-avatar" src={r.avatar} alt="" loading="lazy" />
                      <span className="repo-main">
                        <span className="repo-name">{r.name}</span>
                        {r.description && <span className="repo-desc">{r.description}</span>}
                        <span className="repo-meta">
                          {r.language && (
                            <>
                              <span className="lang-dot" style={{ background: LANGUAGE_COLORS[r.language] ?? "#8b949e" }} />
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
        </div>
      )}
    </section>
  );
}
