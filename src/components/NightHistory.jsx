import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { searchTopRepos, formatStars, LANGUAGE_COLORS } from "../api";

// For each past year, the brightest repo born within ±3 days of tonight's
// date. Past windows never change, so results cache forever — the sky
// fills in more with every visit, even under rate limits.
const pad = (n) => String(n).padStart(2, "0");

function windowFor(year, month, day) {
  const mk = (d) => {
    const dt = new Date(Date.UTC(year, month - 1, day + d));
    return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
  };
  return { from: mk(-3), to: mk(3) };
}

export default function NightHistory() {
  const now = new Date();
  const years = [];
  for (let y = now.getFullYear() - 1; y >= 2008; y--) years.push(y);

  const [rows, setRows] = useState({});
  const [clouded, setClouded] = useState(false);
  const [sweep, setSweep] = useState(0); // bump to resume after rate limit
  const dead = useRef(false);

  useEffect(() => {
    dead.current = false;
    setClouded(false);
    (async () => {
      for (const year of years) {
        if (dead.current) return;
        if (rows[year]) continue; // already observed this sweep
        const { from, to } = windowFor(year, now.getMonth() + 1, now.getDate());
        try {
          const items = await searchTopRepos({ from, to, perPage: 1, ttlMs: Infinity });
          if (dead.current) return;
          setRows((prev) => ({ ...prev, [year]: items[0] ?? "empty" }));
        } catch {
          if (!dead.current) setClouded(true);
          return; // stop the sweep; cached years stay lit
        }
      }
    })();
    return () => { dead.current = true; };
  }, [sweep]);

  const tonight = now.toLocaleDateString("en-US", { month: "long", day: "numeric" });

  return (
    <section className="section" id="night-history">
      <div className="section-head">
        <h2 className="section-title">This Night in History</h2>
        <span className="section-note">{tonight}, every year</span>
      </div>
      <p className="section-lede">
        The sky above this date, replayed. For every year since 2008: the brightest
        star born within three nights of tonight — projects that began on a{" "}
        {tonight} and went on to light up the sky.
      </p>

      <div className="telescope">
        <div className="nh-timeline">
          {years.map((year, i) => {
            const r = rows[year];
            return (
              <div className="nh-row" key={year}>
                <span className="nh-year">{year}</span>
                <span className="nh-node" />
                {r === undefined && (
                  <span className={`nh-pending ${clouded ? "" : "pulse"}`}>
                    {clouded ? "· clouded ·" : "observing…"}
                  </span>
                )}
                {r === "empty" && <span className="nh-pending">an empty patch of sky</span>}
                {r && r !== "empty" && (
                  <motion.a
                    className="repo-row nh-repo"
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    initial={{ opacity: 0, x: -14 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35 }}
                  >
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
                      </span>
                    </span>
                    <span className="repo-stars">
                      <span className="count">★ {formatStars(r.stars)}</span>
                      <span className="unit">since that night</span>
                    </span>
                  </motion.a>
                )}
              </div>
            );
          })}
        </div>

        {clouded && (
          <div className="state" style={{ padding: "18px 0 4px" }}>
            <span className="big">☁</span>
            Clouds rolled in — GitHub's rate limit. Observed years stay charted.
            <button
              className="btn-planetarium"
              style={{ marginTop: 10 }}
              onClick={() => setSweep((s) => s + 1)}
            >
              resume the sweep
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
