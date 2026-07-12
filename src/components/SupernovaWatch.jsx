import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchOfficialTrending, fetchRepo, formatStars, LANGUAGE_COLORS } from "../api";

// A supernova is a star suddenly shining far brighter than its baseline.
// Here: stars gained TODAY vs. the repo's lifetime stars-per-day average.
// A 50× spike means today alone delivered fifty ordinary days of growth.

const MIN_RATIO = 3; // below this, it's just a bright day, not an event

function spikeClass(ratio) {
  if (ratio >= 100) return { label: "Type Ia", note: "a once-in-a-lifetime detonation" };
  if (ratio >= 30) return { label: "Type II", note: "core collapse — massive brightening" };
  if (ratio >= 10) return { label: "Nova", note: "a violent outburst" };
  return { label: "Flare", note: "unusually bright tonight" };
}

// Astronomical magnitude change: Δm = 2.5·log10(brightness ratio).
const deltaMag = (ratio) => (2.5 * Math.log10(ratio)).toFixed(1);

function designation(rank) {
  const d = new Date();
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return `SN ${iso}${String.fromCharCode(65 + rank)}`;
}

export default function SupernovaWatch() {
  const [events, setEvents] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const trending = await fetchOfficialTrending("daily");
        // Cheap pre-rank: today's gain as a fraction of prior mass. Only the
        // top candidates cost a repo lookup (for age → lifetime baseline).
        const frac = (r) => r.gained / Math.max(1, r.stars - r.gained);
        const candidates = trending
          .filter((r) => r.gained && r.stars > 0)
          .sort((a, b) => frac(b) - frac(a))
          .slice(0, 8);

        const detail = await Promise.all(
          candidates.map((c) => fetchRepo(c.fullName).catch(() => null))
        );
        if (dead) return;

        const scored = candidates
          .map((c, i) => {
            const d = detail[i];
            if (!d) return null;
            const ageDays = Math.max(1, (Date.now() - new Date(d.createdAt)) / 864e5);
            const baseline = d.stars / ageDays;
            const ratio = c.gained / Math.max(0.1, baseline);
            return { ...c, createdAt: d.createdAt, ageDays, baseline, ratio };
          })
          .filter((e) => e && e.ratio >= MIN_RATIO)
          .sort((a, b) => b.ratio - a.ratio)
          .slice(0, 6);

        setEvents(scored);
      } catch {
        if (!dead) setError(true);
      }
    })();
    return () => { dead = true; };
  }, []);

  return (
    <section className="section" id="supernova">
      <div className="section-head">
        <h2 className="section-title">Supernova Watch</h2>
        <span className="section-note">transient event survey</span>
      </div>
      <p className="section-lede">
        Most stars brighten slowly. Sometimes one detonates. We compare tonight's
        star gain against each repository's <em>lifetime</em> daily average — a
        spike of 10× or more is a genuine astronomical event, not just a good day.
      </p>

      <div className="telescope">
        {error && (
          <div className="state">
            <span className="big">☁</span>
            The survey instruments are clouded — rate limit. Try again in a minute.
          </div>
        )}
        {!events && !error && (
          <div className="state pulse">
            <span className="big">💥</span>
            Scanning the sky for transient events…
          </div>
        )}
        {events && events.length === 0 && (
          <div className="state">
            <span className="big">🌌</span>
            A quiet night — no detonations detected. The sky brightens gradually.
          </div>
        )}

        <AnimatePresence>
          {events &&
            events.map((e, i) => {
              const k = spikeClass(e.ratio);
              return (
                <motion.a
                  key={e.fullName}
                  href={e.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`repo-row sn-row ${i === 0 ? "rank-1" : ""}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                >
                  <span className="sn-badge">
                    <span className="sn-ratio">×{e.ratio >= 10 ? Math.round(e.ratio) : e.ratio.toFixed(1)}</span>
                    <span className="sn-mag">Δ{deltaMag(e.ratio)} mag</span>
                  </span>
                  <img className="repo-avatar" src={e.avatar} alt="" loading="lazy" />
                  <span className="repo-main">
                    <span className="repo-name">
                      <span className="owner">{e.owner} / </span>
                      {e.name}
                      <span className="sn-designation">{designation(i)} · {k.label}</span>
                    </span>
                    {e.description && <span className="repo-desc">{e.description}</span>}
                    <span className="repo-meta">
                      {e.language && (
                        <>
                          <span
                            className="lang-dot"
                            style={{ background: LANGUAGE_COLORS[e.language] ?? "#8b949e" }}
                          />
                          <span className="lang-name">{e.language}</span>
                        </>
                      )}
                      <span className="sn-baseline">
                        baseline {e.baseline >= 10 ? Math.round(e.baseline) : e.baseline.toFixed(1)} ★/day
                        · {k.note}
                      </span>
                    </span>
                  </span>
                  <span className="repo-stars">
                    <span className="count gold-count">+{formatStars(e.gained)}</span>
                    <span className="unit">stars tonight</span>
                  </span>
                </motion.a>
              );
            })}
        </AnimatePresence>
      </div>
    </section>
  );
}
