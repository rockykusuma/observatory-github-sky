import { useEffect, useMemo, useRef, useState } from "react";
import { fetchOfficialTrending, formatStars, LANGUAGE_COLORS } from "../api";

// ---------------------------------------------------------------------------
// The Planetarium, rebuilt as a living instrument:
//   · Night Tour   — a cinematic fly-through of tonight's top five
//   · Deep Sky     — stars sit at real depth (massive old giants far away,
//                    tonight's risers close), so panning parallaxes
//   · Zoomable     — wheel / pinch to zoom, drag to pan; labels resolve as
//                    you get closer
//   · Living Sky   — supernovae actually detonate on the biggest gainers,
//                    and shooting stars are real newborn repos
// One camera {x, y, z} eased every frame; all motion hangs off it.
// ---------------------------------------------------------------------------

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

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const TOUR_STOPS = 5;
const TOUR_DWELL = 4200;

export default function Planetarium({ onClose }) {
  const [repos, setRepos] = useState(null);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState("tour"); // tour | free
  const [tourIdx, setTourIdx] = useState(-1);
  const [hover, setHover] = useState(null);
  const [nova, setNova] = useState(null);
  const [meteor, setMeteor] = useState(null);

  const starRefs = useRef([]);
  const lineRefs = useRef([]);
  const labelRefs = useRef([]);
  const cam = useRef({ x: 50, y: 50, z: 1 });
  const target = useRef({ x: 50, y: 50, z: 1 });
  const pointers = useRef(new Map());
  const pinchDist = useRef(0);
  const moved = useRef(false);
  const tourTimers = useRef([]);
  const modeRef = useRef("tour");
  modeRef.current = mode;

  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

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

  // ---- star placement: shuffled grid + jitter; depth from total mass ----
  const stars = useMemo(() => {
    if (!repos) return [];
    const maxG = Math.max(...repos.map((r) => r.gained ?? 1), 1);
    const maxS = Math.max(...repos.map((r) => r.stars ?? 1), 2);
    const rnd = makeRng(hash(new Date().toDateString() + repos.map((r) => r.id).join("")));
    const cols = 6, rows = 4;
    const cells = seededShuffle(Array.from({ length: cols * rows }, (_, i) => i), rnd);
    return repos.map((r, i) => {
      const cell = cells[i % cells.length];
      const col = cell % cols;
      const row = Math.floor(cell / cols);
      const x = 6 + ((col + 0.2 + rnd() * 0.6) / cols) * 88;
      const y = 14 + ((row + 0.2 + rnd() * 0.6) / rows) * 64;
      const size = 10 + 32 * Math.sqrt((r.gained ?? 1) / maxG);
      // Old giants hang deep in the sky; tonight's risers float close.
      const pz = 0.4 + 0.6 * (1 - Math.log(Math.max(r.stars, 2)) / Math.log(maxS));
      const phase = rnd() * Math.PI * 2;
      // Flicker tempo ∝ how violently it's brightening tonight.
      const flick = 4.5 - 3 * Math.sqrt((r.gained ?? 1) / maxG);
      return { repo: r, x, y, size, pz, rank: i + 1, idx: i, phase, flick };
    });
  }, [repos]);

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

  // ---- camera + jelly + parallax: one RAF drives everything ----
  useEffect(() => {
    if (!stars.length) return;
    let raf;
    const start = performance.now();
    const loop = (now) => {
      const t = (now - start) / 1000;
      const c = cam.current;
      const g = target.current;
      c.x += (g.x - c.x) * 0.055;
      c.y += (g.y - c.y) * 0.055;
      c.z += (g.z - c.z) * 0.06;

      const labelOpacity = clamp((c.z - 1.15) * 2.2, 0, 1);
      const scale = 0.55 + 0.45 * c.z;
      const pos = [];

      for (let i = 0; i < stars.length; i++) {
        const st = stars[i];
        const ox = reduceMotion ? 0 : 0.7 * Math.sin(0.5 * t + st.phase) + 0.5 * Math.sin(0.3 * t + st.y * 0.05);
        const oy = reduceMotion ? 0 : 0.9 * Math.sin(0.45 * t + st.phase * 1.4) + 0.6 * Math.sin(0.35 * t + st.x * 0.05);
        const depth = st.pz;
        const sx = 50 + (st.x - c.x + ox) * c.z * depth;
        const sy = 50 + (st.y - c.y + oy) * c.z * depth;
        pos[i] = [sx, sy];
        const el = starRefs.current[i];
        if (el) {
          el.style.transform = `translate(${sx.toFixed(3)}vw, ${sy.toFixed(3)}dvh)`;
          el.style.setProperty("--k", (scale * (0.7 + 0.3 * depth)).toFixed(3));
          el.style.setProperty("--lo", labelOpacity.toFixed(2));
        }
      }

      for (let ci = 0; ci < constellations.length; ci++) {
        const cn = constellations[ci];
        const poly = lineRefs.current[ci];
        if (poly) {
          poly.setAttribute(
            "points",
            cn.pts.map((p) => `${pos[p.idx][0].toFixed(2)},${pos[p.idx][1].toFixed(2)}`).join(" ")
          );
        }
        const lab = labelRefs.current[ci];
        if (lab) {
          const [lx, ly] = pos[cn.pts[0].idx];
          lab.style.transform = `translate(${lx.toFixed(2)}vw, ${(ly + 3).toFixed(2)}dvh) translateX(-50%)`;
        }
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [stars, constellations, reduceMotion]);

  // ---- the night tour ----
  useEffect(() => {
    if (!stars.length || mode !== "tour") return;
    if (reduceMotion) {
      setMode("free");
      return;
    }
    const stops = stars.slice(0, TOUR_STOPS);
    const timers = stops.map((st, i) =>
      setTimeout(() => {
        setTourIdx(i);
        target.current = { x: st.x, y: st.y, z: 2.5 };
      }, 900 + i * TOUR_DWELL)
    );
    timers.push(
      setTimeout(() => {
        setTourIdx(-1);
        target.current = { x: 50, y: 50, z: 1 };
        setMode("free");
      }, 900 + stops.length * TOUR_DWELL)
    );
    tourTimers.current = timers;
    return () => timers.forEach(clearTimeout);
  }, [stars, mode, reduceMotion]);

  const endTour = (zoomOut) => {
    tourTimers.current.forEach(clearTimeout);
    setTourIdx(-1);
    if (zoomOut) target.current = { x: 50, y: 50, z: 1 };
    setMode("free");
  };

  const replayTour = () => {
    target.current = { x: 50, y: 50, z: 1 };
    setMode("tour");
  };

  // ---- living sky: supernovae + labeled newborn meteors ----
  useEffect(() => {
    if (!stars.length || reduceMotion) return;
    const iv = setInterval(() => {
      const pick = stars[Math.floor(Math.random() * Math.min(8, stars.length))];
      setNova({ idx: pick.idx, key: Date.now() });
      setTimeout(() => setNova(null), 2600);
    }, 6500);
    return () => clearInterval(iv);
  }, [stars, reduceMotion]);

  useEffect(() => {
    if (!repos || repos.length < 18 || reduceMotion) return;
    const iv = setInterval(() => {
      const tail = repos.slice(15);
      setMeteor({
        repo: tail[Math.floor(Math.random() * tail.length)],
        key: Date.now(),
        left: 15 + Math.random() * 55,
      });
      setTimeout(() => setMeteor(null), 3400);
    }, 9500);
    return () => clearInterval(iv);
  }, [repos, reduceMotion]);

  // ---- input: wheel zoom, drag pan, pinch, idle parallax ----
  const zoomAt = (clientX, clientY, factor) => {
    const W = window.innerWidth, H = window.innerHeight;
    const g = target.current;
    const z2 = clamp(g.z * factor, 0.85, 3.4);
    // keep the sky point under the cursor fixed while zooming
    const mx = (clientX / W) * 100 - 50;
    const my = (clientY / H) * 100 - 50;
    g.x = g.x + mx / g.z - mx / z2;
    g.y = g.y + my / g.z - my / z2;
    g.z = z2;
    g.x = clamp(g.x, 15, 85);
    g.y = clamp(g.y, 15, 85);
  };

  const onWheel = (e) => {
    if (modeRef.current === "tour") endTour(false);
    zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0016));
  };

  const onPointerDown = (e) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved.current = false;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchDist.current = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };

  const onPointerMove = (e) => {
    const p = pointers.current.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;

    if (pointers.current.size === 2) {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDist.current > 0) {
        if (modeRef.current === "tour") endTour(false);
        zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, d / pinchDist.current);
      }
      pinchDist.current = d;
      moved.current = true;
      return;
    }

    if (Math.abs(dx) + Math.abs(dy) > 4) {
      if (modeRef.current === "tour") endTour(false);
      moved.current = true;
      const g = target.current;
      const W = window.innerWidth, H = window.innerHeight;
      g.x = clamp(g.x - (dx / W) * 100 / g.z, 15, 85);
      g.y = clamp(g.y - (dy / H) * 100 / g.z, 15, 85);
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
  };

  const onPointerUp = (e) => {
    pointers.current.delete(e.pointerId);
    pinchDist.current = 0;
  };

  const onMouseMove = (e) => {
    // idle look-around: only when zoomed out, in free mode, not dragging
    if (modeRef.current !== "free" || pointers.current.size > 0) return;
    const g = target.current;
    if (g.z > 1.12) return;
    g.x = 50 + ((e.clientX / window.innerWidth) * 100 - 50) * 0.07;
    g.y = 50 + ((e.clientY / window.innerHeight) * 100 - 50) * 0.05;
  };

  const tourStar = tourIdx >= 0 ? stars[tourIdx] : null;

  return (
    <div className="planetarium">
      <div className="plan-head">
        <span className="plan-title">✦ Planetarium — tonight's trending sky</span>
        <span className="plan-head-actions">
          {mode === "tour" ? (
            <button className="plan-close" onClick={() => endTour(true)}>skip tour ▸</button>
          ) : (
            <button className="plan-close" onClick={replayTour}>▶ replay tour</button>
          )}
          <button className="plan-close" onClick={onClose}>✕ close</button>
        </span>
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

      <div className="plan-milkyway" aria-hidden="true" />

      <div className="plan-meteors" aria-hidden="true">
        <span className="meteor m1" />
        <span className="meteor m2" />
        <span className="meteor m3" />
        {meteor && (
          <span key={meteor.key} className="meteor tagged" style={{ left: `${meteor.left}%` }}>
            <span className="meteor-label">☄ {meteor.repo.name} · newborn tonight</span>
          </span>
        )}
      </div>

      <div
        className="plan-dome grabby"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onMouseMove={onMouseMove}
        style={{ touchAction: "none" }}
      >
        <svg className="plan-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
          {constellations.map((c, ci) => (
            <polyline
              key={c.lang}
              ref={(el) => (lineRefs.current[ci] = el)}
              className="plan-line"
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
            style={{ color: LANGUAGE_COLORS[c.lang] ?? "#8b949e" }}
          >
            {c.lang}
          </span>
        ))}

        {stars.map((st, i) => {
          const s = st.size;
          return (
            <span
              key={st.repo.id}
              ref={(el) => (starRefs.current[i] = el)}
              className="star-node"
              style={{
                opacity: 0.55 + 0.45 * st.pz,
                filter: st.pz < 0.62 ? `blur(${((0.62 - st.pz) * 3).toFixed(1)}px)` : undefined,
                zIndex: Math.round(st.pz * 10),
              }}
            >
              {i === 0 && (
                <span
                  className="plan-halo"
                  style={{
                    width: s * 2.6, height: s * 2.6,
                    marginLeft: -(s * 2.6) / 2, marginTop: -(s * 2.6) / 2,
                  }}
                />
              )}
              <button
                className={`plan-star ${st.rank === 1 ? "champ" : ""}`}
                style={{
                  width: s, height: s,
                  marginLeft: -s / 2, marginTop: -s / 2,
                  animationDuration: `${st.flick}s`,
                }}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                onClick={() => {
                  if (!moved.current) window.open(st.repo.url, "_blank", "noopener");
                }}
                aria-label={`${st.repo.fullName}, rank ${st.rank} tonight`}
              />
              {i === 0 && <span className="plan-crown">№ 1 tonight</span>}
              <span className="plan-starlabel">{st.repo.name}</span>

              {nova?.idx === i && (
                <span key={nova.key} className="nova" aria-hidden="true">
                  <span className="nova-flash" />
                  <span className="nova-ring" />
                  <span className="nova-ring r2" />
                  <span className="nova-tag">SN · {st.repo.name} · +{formatStars(st.repo.gained ?? 0)} tonight</span>
                </span>
              )}

              {hover === i && mode === "free" && (
                <span className="plan-tooltip">
                  <span className="tt-rank">#{st.rank} tonight · depth {st.pz.toFixed(2)}</span>
                  <span className="tt-name">{st.repo.owner} / <strong>{st.repo.name}</strong></span>
                  <span className="tt-gained">
                    +{formatStars(st.repo.gained ?? 0)} today · ★ {formatStars(st.repo.stars)} total
                  </span>
                </span>
              )}
            </span>
          );
        })}
      </div>

      {tourStar && (
        <div className="tour-card" key={tourIdx}>
          <span className="tour-rank">№ {tourStar.rank} tonight</span>
          <span className="tour-name">
            {tourStar.repo.owner} / <strong>{tourStar.repo.name}</strong>
          </span>
          {tourStar.repo.description && (
            <span className="tour-desc">{tourStar.repo.description}</span>
          )}
          <span className="tour-stats">
            +{formatStars(tourStar.repo.gained ?? 0)} stars today · ★ {formatStars(tourStar.repo.stars)} total
            {tourStar.repo.language && ` · ${tourStar.repo.language}`}
          </span>
          <span className="tour-dots">
            {Array.from({ length: TOUR_STOPS }, (_, i) => (
              <span key={i} className={`tour-dot ${i === tourIdx ? "on" : ""}`} />
            ))}
          </span>
        </div>
      )}

      {mode === "free" && (
        <div className="plan-hint">
          scroll or pinch to zoom · drag to pan · giants sit deep, tonight's risers float close ·
          supernovae mark the biggest gainers · click a star to visit · esc to exit
        </div>
      )}
    </div>
  );
}
