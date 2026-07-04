import { useEffect, useMemo, useRef, useState } from "react";
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

  const starRefs = useRef([]);
  const lineRefs = useRef([]);
  const labelRefs = useRef([]);

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
  // jittered within each cell so nothing overlaps. Each star also gets a
  // random phase so it sways on its own tempo.
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
      const phase = rnd() * Math.PI * 2;
      return { repo: r, x, y, size, rank: i + 1, idx: i, phase };
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

  // ---- the jelly ----
  // Every frame, each star drifts by two summed sine waves: one keyed to its
  // own phase (individual jitter) and one keyed to its position (a slow wave
  // that travels across the whole field, so neighbours move together and the
  // constellation undulates as one soft body). Constellation lines are redrawn
  // to the live positions each frame so they stretch and bend with the stars.
  useEffect(() => {
    if (!stars.length) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    let raf;
    const start = performance.now();
    const loop = (now) => {
      const t = (now - start) / 1000;
      const W = window.innerWidth || 1;
      const H = window.innerHeight || 1;

      const offs = stars.map((st) => {
        const ox = 1.0 * Math.sin(0.6 * t + st.phase) + 0.9 * Math.sin(0.32 * t + st.y * 0.05);
        const oy = 1.4 * Math.sin(0.5 * t + st.phase * 1.4) + 1.0 * Math.sin(0.4 * t + st.x * 0.05);
        return [ox, oy];
      });

      for (let i = 0; i < stars.length; i++) {
        const el = starRefs.current[i];
        if (!el) continue;
        const [ox, oy] = offs[i];
        el.style.setProperty("--jx", `${((ox / 100) * W).toFixed(2)}px`);
        el.style.setProperty("--jy", `${((oy / 100) * H).toFixed(2)}px`);
      }

      for (let ci = 0; ci < constellations.length; ci++) {
        const c = constellations[ci];
        const poly = lineRefs.current[ci];
        if (poly) {
          poly.setAttribute(
            "points",
            c.pts
              .map((p) => {
                const [ox, oy] = offs[p.idx];
                return `${(p.x + ox).toFixed(2)},${(p.y + oy).toFixed(2)}`;
              })
              .join(" ")
          );
        }
        const lab = labelRefs.current[ci];
        if (lab) {
          const [ox, oy] = offs[c.pts[0].idx];
          lab.style.setProperty("--jx", `${((ox / 100) * W).toFixed(2)}px`);
          lab.style.setProperty("--jy", `${((oy / 100) * H).toFixed(2)}px`);
        }
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [stars, constellations]);

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

      <div className="plan-meteors" aria-hidden="true">
        <span className="meteor m1" />
        <span className="meteor m2" />
        <span className="meteor m3" />
        <span className="meteor m4" />
      </div>

      <div className="plan-dome">
        <svg className="plan-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
          {constellations.map((c, ci) => (
            <polyline
              key={c.lang}
              ref={(el) => (lineRefs.current[ci] = el)}
              className="plan-line"
              points={c.pts.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke={LANGUAGE_COLORS[c.lang] ?? "#8b949e"}
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              style={{ animationDelay: `${0.4 + ci * 0.25}s` }}
            />
          ))}
        </svg>

        {constellations.map((c, ci) => (
          <span
            key={c.lang}
            ref={(el) => (labelRefs.current[ci] = el)}
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
          const twinkle = 2.6 + (i % 6) * 0.4;
          const s = st.size;
          return (
            <span
              key={st.repo.id}
              ref={(el) => (starRefs.current[i] = el)}
              className="star-node"
              style={{ left: `${st.x}%`, top: `${st.y}%` }}
            >
              {i === 0 && (
                <span
                  className="plan-halo"
                  style={{
                    width: s * 2.6,
                    height: s * 2.6,
                    marginLeft: -(s * 2.6) / 2,
                    marginTop: -(s * 2.6) / 2,
                  }}
                />
              )}
              <button
                className={`plan-star ${st.rank === 1 ? "champ" : ""}`}
                style={{
                  width: s,
                  height: s,
                  marginLeft: -s / 2,
                  marginTop: -s / 2,
                  animationDelay: `${delay}s, ${delay + 0.7}s`,
                  animationDuration: `0.7s, ${twinkle}s`,
                }}
                onMouseEnter={() => setHover(st)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(st)}
                onBlur={() => setHover(null)}
                onClick={() => window.open(st.repo.url, "_blank", "noopener")}
                aria-label={`${st.repo.fullName}, rank ${st.rank} tonight`}
              />
              {i === 0 && <span className="plan-crown">№ 1 tonight</span>}
            </span>
          );
        })}

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
      </div>

      <div className="plan-hint">
        each star is a repository trending tonight · size = stars gained today · same-language
        stars form constellations · click a star to visit · esc to exit
      </div>
    </div>
  );
}
