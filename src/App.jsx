import { useState } from "react";
import Starfield from "./components/Starfield.jsx";
import Hero from "./components/Hero.jsx";
import Almanac from "./components/Almanac.jsx";
import SkyChart from "./components/SkyChart.jsx";
import Leaderboard from "./components/Leaderboard.jsx";
import TimeMachine from "./components/TimeMachine.jsx";
import EclipseWatch from "./components/EclipseWatch.jsx";
import Planetarium from "./components/Planetarium.jsx";

export default function App() {
  const [planetarium, setPlanetarium] = useState(false);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <>
      <Starfield />
      <div className="page">
        <header className="masthead">
          <div className="masthead-brand">
            <span className="masthead-title">🔭 The Observatory</span>
            <span className="masthead-sub">github, charted nightly</span>
          </div>
          <div className="masthead-right">
            <span className="masthead-date">{today}</span>
            <button className="btn-planetarium" onClick={() => setPlanetarium(true)}>
              ✦ Planetarium
            </button>
          </div>
        </header>

        <Hero />
        <Almanac />
        <SkyChart />
        <Leaderboard />
        <TimeMachine />
        <EclipseWatch />

        <footer className="colophon">
          <span>
            Rankings blend GitHub's official trending signal (stars gained per day)
            with archival queries over repositories born in each window.
          </span>
          <span>
            data: <a href="https://docs.github.com/en/rest/search" target="_blank" rel="noreferrer">GitHub Search API</a>
            {" + "}
            <a href="https://github.com/trending" target="_blank" rel="noreferrer">github.com/trending</a>
            {" · "}built under clear skies
          </span>
        </footer>
      </div>

      {planetarium && <Planetarium onClose={() => setPlanetarium(false)} />}
    </>
  );
}
