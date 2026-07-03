import { useEffect, useMemo, useState } from "react";
import { fetchOfficialTrending, formatStars, LANGUAGE_COLORS } from "../api";

const hash = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const makeRng = (seed) => {
  let s = seed >>> 0 || 1;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
};

function seededShuffle(arr, rnd) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Planetarium({ onClose }) {
  const [repos, setRepos] = useState(null);
  const [error, setError] = useState(null);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    fetchOfficialTrending("daily")
      .then((items) => setRepos(items.slice(0, 24)))
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // Deterministic star placement: grid cells shuffled by a daily seed,
  // jittered within each cell so nothing overlaps.
  const stars = useMemo(() => {
    if (!repos) return [];
    const maxG = Math.max(...repos.map((r) => r.gained ?? 1), 1);
    const rnd = makeRng(hash(new Date().toDateString() + repos.map((r) => r.id).join("")));
    const cols = 6;
    const rows = 4;
    const cells = seededShuffle(
      Array.from({ length: cols * rows }, (_, i) => i),
      rnd
    );
    return repos.map((r, i) => {
      const cell = cells[i % cells.length];
      const col = cell % cols;
      const row = Math.floor(cell / cols);
      const x = ((col + 0.2 + rnd() * 0.6) / cols) * 100;
      const y = 12 + ((row + 0.2 + rnd() * 0.6) / rows) * 68;
      const size = 10 + 34 * Math.sqrt((r.gained ?? 1) / maxG);
      return { repo: r, x, y, size, rank: i + 1 };
    });
  }, [repos]);

  // Constellations: stars of the same language, joined by faint lines.
  const constellations = useMemo(() => {
    const groups = {};
    for (const st of stars) {
      if (!st.repo.language) continue;
      (groups[st.repo.language] ??= []).push(st);
    }
    return Object.entries(groups)
      .filter(([, g]) => g.length >= 2)
      .map(([lang, g]) => ({ lang, pts: [...g].sort((a, b) => a.x - b.x) }));
  }, [stars]);

  return (
    <div className="planetarium">
      <div className="plan-head">
        <span className="plan-title">✦ Planetarium — tonight's trending sky</span>
        <button className="plan-close" onClick={onClose}>
          ✕ close
        </button>
      </div>

      {error && (
        <div className="state" style={{ marginTop: "32vh" }}>
          <span className="big">☁</span>
          The dome is fogged over — try again in a minute.
        </div>
      )}
      {!repos && !error && (
        <div className="state pulse" style={{ marginTop: "32vh" }}>
          <span className="big">✦</span>
          Opening the dome…
        </div>
      )}

      <svg className="plan-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
        {constellations.map((c) => (
          <polyline
            key={c.lang}
            points={c.pts.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke={LANGUAGE_COLORS[c.lang] ?? "#8b949e"}
            strokeOpacity="0.28"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      {constellations.map((c) => (
        <span
          key={c.lang}
          className="plan-lang"
          style={{
            left: `${c.pts[0].x}%`,
            top: `${c.pts[0].y}%`,
            color: LANGUAGE_COLORS[c.lang] ?? "#8b949e",
          }}
        >
          {c.lang}
        </span>
      ))}

      {stars.map((st, i) => {
        const delay = 0.2 + i * 0.05;
        return (
          <button
            key={st.repo.id}
            className={`plan-star ${st.rank === 1 ? "champ" : ""}`}
            style={{
              left: `${st.x}%`,
              top: `${st.y}%`,
              width: st.size,
              height: st.size,
              marginLeft: -st.size / 2,
              marginTop: -st.size / 2,
              animationDelay: `${delay}s, ${delay + 0.7}s`,
            }}
            onMouseEnter={() => setHover(st)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(st)}
            onBlur={() => setHover(null)}
            onClick={() => window.open(st.repo.url, "_blank", "noopener")}
            aria-label={`${st.repo.fullName}, rank ${st.rank} tonight`}
          />
        );
      })}

      {stars[0] && (
        <span className="plan-crown" style={{ left: `${stars[0].x}%`, top: `${stars[0].y}%` }}>
          № 1 tonight
        </span>
      )}

      {hover && (
        <div className="plan-tooltip" style={{ left: `${hover.x}%`, top: `${hover.y}%` }}>
          <div className="tt-rank">#{hover.rank} tonight</div>
          <div className="tt-name">
            {hover.repo.owner} / <strong>{hover.repo.name}</strong>
          </div>
          <div className="tt-gained">
            +{formatStars(hover.repo.gained ?? 0)} today · ★ {formatStars(hover.repo.stars)} total
          </div>
        </div>
      )}

      <div className="plan-hint">
        each star is a repository trending tonight · size = stars gained today · same-language
        stars form constellations · click a star to visit · esc to exit
      </div>
    </div>
  );
}
