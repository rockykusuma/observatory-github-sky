import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchRepo, fetchStarHistory, formatStars, LANGUAGE_COLORS } from "../api";
import { getParam, setParam, revealSection } from "../urlstate";

const PRESETS = ["facebook/react", "karpathy/nanoGPT", "rust-lang/rust", "excalidraw/excalidraw"];

// Stellar classification by luminosity (total stars).
const CLASSES = [
  { min: 100000, cls: "Hypergiant", spectral: "O", color: "#9bb0ff", note: "among the brightest objects ever recorded" },
  { min: 50000, cls: "Supergiant", spectral: "B", color: "#aabfff", note: "visible from anywhere in the ecosystem" },
  { min: 10000, cls: "Giant", spectral: "A", color: "#cad7ff", note: "a fixture of the night sky" },
  { min: 1000, cls: "Main Sequence", spectral: "G", color: "#ffd866", note: "burning steadily" },
  { min: 100, cls: "Red Dwarf", spectral: "M", color: "#ffb26b", note: "small, but most stars are" },
  { min: 0, cls: "Protostar", spectral: "—", color: "#c9a0ff", note: "still gathering mass" },
];

const classify = (stars) => CLASSES.find((c) => stars >= c.min);

const velocity = (repo) => {
  const ageDays = Math.max(1, (Date.now() - new Date(repo.createdAt)) / 864e5);
  return repo.stars / ageDays;
};

function ageLabel(createdAt) {
  const days = (Date.now() - new Date(createdAt)) / 864e5;
  if (days < 90) return `${Math.round(days)} days`;
  if (days < 730) return `${Math.round(days / 30)} months`;
  return `${(days / 365).toFixed(1)} years`;
}

/** Sampled cumulative star curve, drawn as inline SVG. */
function StarCurve({ repo, points }) {
  const W = 640, H = 220, PAD = { l: 46, r: 14, t: 14, b: 26 };

  const { path, area, capped, ticks, yTicks } = useMemo(() => {
    const t0 = new Date(repo.createdAt).getTime();
    const t1 = Date.now();
    const capped = repo.stars > 40000;
    const pts = [
      { t: t0, s: 0 },
      ...points.map((p) => ({ t: new Date(p.t).getTime(), s: p.s })),
      { t: t1, s: repo.stars },
    ].sort((a, b) => a.t - b.t);

    const x = (t) => PAD.l + ((t - t0) / Math.max(1, t1 - t0)) * (W - PAD.l - PAD.r);
    const y = (s) => H - PAD.b - (s / Math.max(1, repo.stars)) * (H - PAD.t - PAD.b);

    const path = pts.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.s).toFixed(1)}`).join(" ");
    const area = `${path} L${x(t1).toFixed(1)},${H - PAD.b} L${PAD.l},${H - PAD.b} Z`;

    // Year ticks (at most 6, evenly spaced).
    const y0 = new Date(t0).getFullYear(), y1 = new Date(t1).getFullYear();
    const span = Math.max(1, y1 - y0);
    const step = Math.ceil(span / 5);
    const ticks = [];
    for (let yr = y0 + step; yr <= y1; yr += step) {
      const t = new Date(`${yr}-01-01`).getTime();
      if (t > t0 && t < t1) ticks.push({ x: x(t), label: `'${String(yr).slice(2)}` });
    }
    const yTicks = [0.5, 1].map((f) => ({
      y: y(repo.stars * f),
      label: formatStars(Math.round(repo.stars * f)),
    }));
    return { path, area, capped, ticks, yTicks };
  }, [repo, points]);

  return (
    <div className="spectro-chart">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-label="star history">
        <defs>
          <linearGradient id="spectro-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffd866" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ffd866" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.l} x2={W - PAD.r} y1={t.y} y2={t.y} className="spectro-grid" />
            <text x={PAD.l - 6} y={t.y + 3} className="spectro-tick" textAnchor="end">★{t.label}</text>
          </g>
        ))}
        {ticks.map((t, i) => (
          <text key={i} x={t.x} y={H - 8} className="spectro-tick" textAnchor="middle">{t.label}</text>
        ))}
        <path d={area} fill="url(#spectro-fill)" />
        <motion.path
          d={path}
          className="spectro-line"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />
      </svg>
      <p className="lightyears" style={{ margin: "6px 0 0", textAlign: "center" }}>
        cumulative stars, sampled from the stargazer record
        {capped && " · GitHub's record stops at star #40,000 — the last leg bridges to today"}
      </p>
    </div>
  );
}

export default function Spectrograph() {
  const [input, setInput] = useState("");
  const [target, setTarget] = useState(() => getParam("scope") || PRESETS[0]);

  useEffect(() => {
    if (getParam("scope")) revealSection("spectrograph");
  }, []);
  const [repo, setRepo] = useState(null);
  const [history, setHistory] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let dead = false;
    setRepo(null);
    setHistory(null);
    setError(null);
    fetchRepo(target)
      .then((r) => {
        if (dead) return;
        setRepo(r);
        return fetchStarHistory(r.fullName, r.stars).then((h) => !dead && setHistory(h));
      })
      .catch((e) => {
        if (dead) return;
        setError(
          e.message === "not-found"
            ? "No star by that name in the catalog — check the owner/repo."
            : "Cloudy skies — rate limit reached. Try again in a minute."
        );
      });
    return () => { dead = true; };
  }, [target]);

  const observe = (e) => {
    e.preventDefault();
    const v = input.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\/+$/, "");
    if (v.includes("/")) {
      setTarget(v);
      setParam("scope", v);
    }
  };

  const k = repo ? classify(repo.stars) : null;

  return (
    <section className="section" id="spectrograph">
      <div className="section-head">
        <h2 className="section-title">The Spectrograph</h2>
        <span className="section-note">point at any star</span>
      </div>
      <p className="section-lede">
        Every star has a spectrum. Type any <em>owner/repo</em> — or paste a GitHub
        URL — and the instrument reads its light: the full growth curve since first
        light, a stellar classification, and its vital signs.
      </p>

      <form className="controls" onSubmit={observe}>
        <input
          className="select eclipse-input"
          placeholder="owner/repo or GitHub URL"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" className="btn-planetarium">observe</button>
        <div className="tabs">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              className={`tab ${p === target ? "active" : ""}`}
              onClick={() => {
                setTarget(p);
                setParam("scope", p);
              }}
            >
              {p.split("/")[1]}
            </button>
          ))}
        </div>
      </form>

      <div className="telescope">
        {error && (
          <div className="state"><span className="big">☁</span>{error}</div>
        )}
        {!repo && !error && (
          <div className="state pulse"><span className="big">🔭</span>Focusing on {target}…</div>
        )}

        <AnimatePresence mode="wait">
          {repo && (
            <motion.div
              key={repo.fullName}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="spectro-head">
                <a href={repo.url} target="_blank" rel="noreferrer" className="spectro-id">
                  <img className="spectro-avatar" src={repo.avatar} alt="" />
                  <span>
                    <span className="spectro-name">
                      <span className="owner">{repo.owner} / </span>{repo.name}
                    </span>
                    {repo.description && <span className="repo-desc">{repo.description}</span>}
                  </span>
                </a>
                <span className="spectro-class" style={{ "--cls": k.color }}>
                  <span className="spectro-class-label">class {k.spectral}</span>
                  <span className="spectro-class-name">{k.cls}</span>
                  <span className="spectro-class-note">{k.note}</span>
                </span>
              </div>

              <div className="champion-stats spectro-stats">
                <div><span className="stat-value gold">★ {formatStars(repo.stars)}</span><span className="stat-label">luminosity</span></div>
                <div><span className="stat-value">{velocity(repo) >= 10 ? Math.round(velocity(repo)) : velocity(repo).toFixed(1)}</span><span className="stat-label">★ / day lifetime</span></div>
                <div><span className="stat-value">{formatStars(repo.forks ?? 0)}</span><span className="stat-label">forks</span></div>
                <div><span className="stat-value">{ageLabel(repo.createdAt)}</span><span className="stat-label">age</span></div>
                {repo.language && (
                  <div>
                    <span className="stat-value" style={{ color: LANGUAGE_COLORS[repo.language] ?? "#e6edf3" }}>
                      {repo.language}
                    </span>
                    <span className="stat-label">spectrum</span>
                  </div>
                )}
              </div>

              {history === null && !error && (
                <div className="state pulse"><span className="big">✨</span>Reading the stargazer record…</div>
              )}
              {history && history.length > 0 && <StarCurve repo={repo} points={history} />}
              {history && history.length === 0 && repo.stars > 0 && (
                <StarCurve repo={repo} points={[]} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
