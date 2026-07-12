import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchRepo, formatStars } from "../api";
import { getParam, setParam, revealSection } from "../urlstate";

const RIVALRIES = [
  { label: "Vue vs React", a: "vuejs/vue", b: "facebook/react" },
  { label: "PyTorch vs TensorFlow", a: "pytorch/pytorch", b: "tensorflow/tensorflow" },
  { label: "Deno vs Node", a: "denoland/deno", b: "nodejs/node" },
  { label: "Zed vs VS Code", a: "zed-industries/zed", b: "microsoft/vscode" },
];

const velocity = (repo) => {
  const ageDays = Math.max(1, (Date.now() - new Date(repo.createdAt)) / 864e5);
  return repo.stars / ageDays;
};

function verdict(a, b) {
  const [leader, chaser] = a.stars >= b.stars ? [a, b] : [b, a];
  const velLeader = velocity(leader);
  const velChaser = velocity(chaser);
  const gap = leader.stars - chaser.stars;

  if (velChaser <= velLeader) {
    return {
      eclipse: false,
      text: (
        <>
          <em>{leader.name}</em> is pulling away — at lifetime velocity, no eclipse is coming.
          The gap of <strong>★ {formatStars(gap)}</strong> only widens.
        </>
      ),
    };
  }
  const days = gap / (velChaser - velLeader);
  const when = new Date(Date.now() + days * 864e5);
  const label =
    days > 365 * 1.5
      ? `${(days / 365).toFixed(1)} years`
      : days > 60
        ? `${Math.round(days / 30)} months`
        : `${Math.round(days)} days`;
  return {
    eclipse: true,
    text: (
      <>
        at current velocity, <em>{chaser.name}</em> eclipses <em>{leader.name}</em> in about{" "}
        <strong>{label}</strong> — around{" "}
        <strong>
          {when.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </strong>
        .
      </>
    ),
  };
}

function StarDisc({ repo, isLeader }) {
  return (
    <a className={`eclipse-body ${isLeader ? "leader" : ""}`} href={repo.url} target="_blank" rel="noreferrer">
      <img className="eclipse-avatar" src={repo.avatar} alt="" />
      <span className="eclipse-name">{repo.name}</span>
      <span className="eclipse-stars">★ {formatStars(repo.stars)}</span>
      <span className="eclipse-vel">≈ {Math.round(velocity(repo))} ★/day lifetime</span>
    </a>
  );
}

export default function EclipseWatch() {
  const [pair, setPair] = useState(() => {
    // Deep link: ?vs=owner/a,owner/b
    const vs = (getParam("vs") || "").split(",");
    if (vs.length === 2 && vs[0].includes("/") && vs[1].includes("/")) {
      return { label: "custom", a: vs[0].trim(), b: vs[1].trim() };
    }
    return RIVALRIES[0];
  });

  useEffect(() => {
    if (getParam("vs")) revealSection("eclipse");
  }, []);
  const [inputA, setInputA] = useState("");
  const [inputB, setInputB] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setData(null);
    setError(null);
    Promise.all([fetchRepo(pair.a), fetchRepo(pair.b)])
      .then(([a, b]) => setData({ a, b }))
      .catch((e) =>
        setError(e.message === "not-found" ? "One of those stars isn't in the catalog — check the owner/name." : "Cloudy skies — rate limit reached. Try again in a minute.")
      );
  }, [pair]);

  const observe = (e) => {
    e.preventDefault();
    if (inputA.includes("/") && inputB.includes("/")) {
      const a = inputA.trim(), b = inputB.trim();
      setPair({ label: "custom", a, b });
      setParam("vs", `${a},${b}`);
    }
  };

  const v = data ? verdict(data.a, data.b) : null;

  return (
    <section className="section" id="eclipse">
      <div className="section-head">
        <h2 className="section-title">Eclipse Watch</h2>
        <span className="section-note">two bodies · one orbit</span>
      </div>
      <p className="section-lede">
        Some stars share an orbit. We track rival repositories converging — and
        predict, from lifetime star velocity, the moment one passes in front of
        the other. A crude instrument, but a fun one.
      </p>

      <div className="controls">
        <div className="tabs">
          {RIVALRIES.map((r) => (
            <button
              key={r.label}
              className={`tab ${r.label === pair.label ? "active" : ""}`}
              onClick={() => {
                setPair(r);
                setParam("vs", `${r.a},${r.b}`);
              }}
            >
              {r.label === pair.label && (
                <motion.span
                  className="tab-pill"
                  layoutId="eclipse-pill"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <form className="controls" onSubmit={observe}>
        <input
          className="select eclipse-input"
          placeholder="owner/repo"
          value={inputA}
          onChange={(e) => setInputA(e.target.value)}
        />
        <span className="section-note">vs</span>
        <input
          className="select eclipse-input"
          placeholder="owner/repo"
          value={inputB}
          onChange={(e) => setInputB(e.target.value)}
        />
        <button type="submit" className="btn-planetarium">
          observe
        </button>
      </form>

      <div className="telescope">
        {error && (
          <div className="state">
            <span className="big">☁</span>
            {error}
          </div>
        )}
        {!data && !error && (
          <div className="state pulse">
            <span className="big">✦</span>
            Aligning the instruments…
          </div>
        )}

        <AnimatePresence mode="wait">
          {data && (
            <motion.div
              key={pair.a + pair.b}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="eclipse-stage">
                <StarDisc repo={data.a} isLeader={data.a.stars >= data.b.stars} />
                <span className="eclipse-vs">☍</span>
                <StarDisc repo={data.b} isLeader={data.b.stars > data.a.stars} />
              </div>

              <div className="eclipse-bar">
                {(() => {
                  const total = data.a.stars + data.b.stars;
                  return (
                    <>
                      <div
                        className="eclipse-fill a"
                        style={{ width: `${(data.a.stars / total) * 100}%` }}
                      />
                      <div
                        className="eclipse-fill b"
                        style={{ width: `${(data.b.stars / total) * 100}%` }}
                      />
                    </>
                  );
                })()}
              </div>

              <p className={`eclipse-verdict ${v.eclipse ? "gold" : ""}`}>{v.text}</p>
              <p className="lightyears" style={{ margin: "14px 0 0", textAlign: "center" }}>
                prediction uses lifetime average velocity — stars, like markets, past
                performance is no guarantee
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
