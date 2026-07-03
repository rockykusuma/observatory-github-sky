import { useEffect, useState } from "react";
import { motion, animate, useMotionValue, useTransform } from "framer-motion";
import { searchTopRepos, fetchOfficialTrending, daysAgo, formatStars } from "../api";
import { downloadChampionCard } from "../cardgen";

function CountUp({ value }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v).toLocaleString());
  useEffect(() => {
    const controls = animate(mv, value, { duration: 1.8, ease: [0.16, 1, 0.3, 1] });
    return controls.stop;
  }, [value]);
  return <motion.span>{rounded}</motion.span>;
}

export default function Hero() {
  const [champ, setChamp] = useState(null);
  const [official, setOfficial] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Preferred: GitHub's official #1 trending repo of the day (stars gained
    // today, any age). Fallback: brightest repo born this week.
    fetchOfficialTrending("daily")
      .then((items) => setChamp(items[0] ?? null))
      .catch(() => {
        setOfficial(false);
        searchTopRepos({ from: daysAgo(7), perPage: 1 })
          .then((items) => setChamp(items[0] ?? null))
          .catch((e) => setError(e.message));
      });
  }, []);

  return (
    <section className="hero">
      <motion.p
        className="hero-kicker"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        ✦ The Observatory
      </motion.p>
      <motion.h1
        className="hero-title"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.1 }}
      >
        Every GitHub star
        <br />
        is a <em>real star</em>.
      </motion.h1>
      <motion.p
        className="hero-lede"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        We chart the night sky of open source: the repositories burning brightest
        tonight, and the ones that lit up any month since 2008. Point the
        telescope. Look back in time.
      </motion.p>

      {error && (
        <div className="state" style={{ maxWidth: 720, margin: "56px auto 0" }}>
          <span className="big">☁</span>
          Cloudy skies — GitHub's rate limit is catching its breath.
          <br />
          The sky clears in about a minute.
        </div>
      )}

      {!champ && !error && (
        <div className="state pulse" style={{ maxWidth: 720, margin: "56px auto 0" }}>
          <span className="big">✦</span>
          Focusing the lens…
        </div>
      )}

      {champ && (
        <motion.a
          href={champ.url}
          target="_blank"
          rel="noreferrer"
          className="champion"
          style={{ display: "block" }}
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="champion-label">
            {official ? "Brightest star tonight — #1 on GitHub trending" : "Brightest star this week"}
          </div>
          <div className="champion-head">
            <img className="champion-avatar" src={champ.avatar} alt="" />
            <div>
              <div className="champion-owner">{champ.owner} /</div>
              <div className="champion-name">{champ.name}</div>
            </div>
          </div>
          {champ.description && <p className="champion-desc">{champ.description}</p>}
          <div className="champion-stats">
            <div>
              <div className="stat-value gold">
                {champ.gained != null ? (
                  <>
                    +<CountUp value={champ.gained} />
                  </>
                ) : (
                  <>
                    ★ <CountUp value={champ.stars} />
                  </>
                )}
              </div>
              <div className="stat-label">
                {champ.gained != null ? "stars gained today" : "stars gathered"}
              </div>
            </div>
            <div>
              <div className="stat-value">★ {formatStars(champ.stars)}</div>
              <div className="stat-label">total luminosity</div>
            </div>
            {champ.forks > 0 && (
              <div>
                <div className="stat-value">{formatStars(champ.forks)}</div>
                <div className="stat-label">forks</div>
              </div>
            )}
            {champ.language && (
              <div>
                <div className="stat-value">{champ.language}</div>
                <div className="stat-label">written in</div>
              </div>
            )}
            <button
              className="btn-card"
              title="Download a shareable champion card (PNG)"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                downloadChampionCard(champ);
              }}
            >
              ↓ save card
            </button>
          </div>
        </motion.a>
      )}
    </section>
  );
}
