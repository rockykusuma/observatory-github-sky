import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { searchRepos, formatStars, LANGUAGE_COLORS } from "../api";
import { parseQuery, toSearch, describe } from "../nlq";
import { getParam, setParam, revealSection } from "../urlstate";

const EXAMPLES = [
  "rust cli tools >1k stars this year",
  "python llm agents this month",
  "active zig projects under 500 stars",
  "typescript, most forked, 2024",
];

export default function AskTheSky() {
  const [input, setInput] = useState("");
  const [chips, setChips] = useState(null);
  const [results, setResults] = useState(null);
  const [state, setState] = useState("idle"); // idle | loading | done | error | rate

  useEffect(() => {
    const q = getParam("ask");
    if (q) {
      ask(q);
      revealSection("ask");
    }
  }, []);

  const ask = (text) => {
    const q = text.trim();
    if (!q) return;
    setInput(q);
    setParam("ask", q);
    const parsed = parseQuery(q);
    const search = toSearch(parsed);
    if (!search.q) {
      setState("error");
      setChips(null);
      setResults(null);
      return;
    }
    setChips(describe(parsed));
    setResults(null);
    setState("loading");
    searchRepos(search)
      .then((items) => {
        setResults(items);
        setState("done");
      })
      .catch((e) => setState(e.message === "rate-limit" ? "rate" : "error"));
  };

  return (
    <section className="section" id="ask">
      <div className="section-head">
        <h2 className="section-title">Ask the Sky</h2>
        <span className="section-note">plain words → star catalog</span>
      </div>
      <p className="section-lede">
        Describe what you're looking for the way you'd say it aloud — a language,
        a star range, a time window, a few keywords. The instrument translates it
        into a catalog query and shows you exactly how it understood you.
      </p>

      <form
        className="controls ask-form"
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
      >
        <input
          className="select ask-input"
          placeholder='try: "game engines in c++ since 2022"'
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" className="btn-planetarium">search</button>
      </form>

      <div className="controls ask-examples">
        {EXAMPLES.map((ex) => (
          <button key={ex} type="button" className="tab" onClick={() => ask(ex)}>
            {ex}
          </button>
        ))}
      </div>

      {(chips || state !== "idle") && (
        <div className="telescope">
          {chips && chips.length > 0 && (
            <div className="ask-chips">
              <span className="ask-chips-label">understood as</span>
              {chips.map((c) => (
                <span key={c.k + c.v} className="ask-chip">
                  <span className="ask-chip-k">{c.k}</span> {c.v}
                </span>
              ))}
            </div>
          )}

          {state === "loading" && (
            <div className="state pulse"><span className="big">✦</span>Consulting the catalog…</div>
          )}
          {state === "rate" && (
            <div className="state"><span className="big">☁</span>Cloudy skies — rate limit reached. Try again in a minute.</div>
          )}
          {state === "error" && (
            <div className="state">
              <span className="big">🌫</span>
              The instrument couldn't parse that — try a language, a star range
              ("&gt;1k stars"), a time ("this year"), or keywords.
            </div>
          )}
          {state === "done" && results && results.length === 0 && (
            <div className="state"><span className="big">🌑</span>An empty patch of sky — no stars match. Loosen a filter.</div>
          )}

          <AnimatePresence>
            {state === "done" &&
              results &&
              results.map((r, i) => (
                <motion.a
                  key={r.id}
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="repo-row"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.05 }}
                >
                  <span className="rank-orb">
                    <span className="rank-num">{i + 1}</span>
                    <span className="rank-mag">mag {(i * 0.4 + 1).toFixed(1)}</span>
                  </span>
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
                    <span className="unit">luminosity</span>
                  </span>
                </motion.a>
              ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}
