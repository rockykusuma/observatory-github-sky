import { useEffect, useState } from "react";

// The site is a long night's observing session — this is the atlas page:
// a sticky index of every instrument, with the active one lit.
const SECTIONS = [
  { id: "ask", label: "Ask" },
  { id: "skychart", label: "Sky Chart" },
  { id: "supernova", label: "Supernovae" },
  { id: "ai-nebula", label: "AI Nebula" },
  { id: "constellations", label: "Newborn" },
  { id: "deep-field", label: "Deep Field" },
  { id: "telescope", label: "Telescope" },
  { id: "night-history", label: "History" },
  { id: "eclipse", label: "Eclipse" },
  { id: "spectrograph", label: "Spectrograph" },
  { id: "your-sky", label: "Your Sky" },
  { id: "log", label: "Log" },
];

export default function SkyAtlas() {
  const [active, setActive] = useState(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id);
        }
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <nav className="atlas" aria-label="sections">
      {SECTIONS.map((s) => (
        <a key={s.id} href={`#${s.id}`} className={`atlas-link ${active === s.id ? "active" : ""}`}>
          <span className="atlas-star">{active === s.id ? "✦" : "·"}</span>
          {s.label}
        </a>
      ))}
    </nav>
  );
}
