import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fetchOfficialTrending, formatStars } from "../api";

// A nightly journal entry composed from the data already on the bench —
// pure templates, seeded by the date, zero cost. Reads like the last page
// an astronomer writes before switching off the dome lights.

const pick = (arr, seed) => arr[seed % arr.length];

const OPENERS = [
  "Dome open at dusk. Seeing was good.",
  "A crisp night at the eyepiece.",
  "Log entry, filed before dawn.",
  "Conditions steady; the survey ran clean.",
  "Another night above the code-line clouds.",
];

const CLOSERS = [
  "Dome closed. Clear skies tomorrow, with luck.",
  "Instruments capped until tomorrow night.",
  "The sky keeps its own schedule. We'll be here.",
  "End of watch. The stars, as ever, kept burning.",
  "Filed, stamped, and shelved beside fifteen years of nights.",
];

function compose(items) {
  const seed = Number(new Date().toISOString().slice(0, 10).replace(/-/g, ""));
  const champ = items[0];
  const second = items[1];
  const totalGained = items.reduce((a, r) => a + (r.gained || 0), 0);

  // Language census across tonight's sky.
  const census = {};
  for (const r of items) if (r.language) census[r.language] = (census[r.language] || 0) + 1;
  const [topLang, topLangN] = Object.entries(census).sort((a, b) => b[1] - a[1])[0] ?? [null, 0];

  const parts = [];
  parts.push(pick(OPENERS, seed));
  if (champ) {
    parts.push(
      `The brightest object tonight was ${champ.owner}/${champ.name}, gathering ${formatStars(champ.gained ?? 0)} stars before the log closed` +
        (second ? `, with ${second.name} trailing at +${formatStars(second.gained ?? 0)}.` : ".")
    );
  }
  if (totalGained > 0) {
    parts.push(
      `Across the twenty-five charted objects the sky brightened by ${formatStars(totalGained)} stars in a single rotation.`
    );
  }
  if (topLang && topLangN >= 3) {
    parts.push(
      `${topLang} dominated the field — ${topLangN} of tonight's objects burn in that spectrum.`
    );
  }
  parts.push(pick(CLOSERS, seed >> 3));
  return parts;
}

export default function ObserversLog() {
  const [lines, setLines] = useState(null);
  const [cloudy, setCloudy] = useState(false);

  useEffect(() => {
    fetchOfficialTrending("daily")
      .then((items) => setLines(compose(items)))
      .catch(() => setCloudy(true));
  }, []);

  const dateline = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <section className="section" id="log">
      <div className="section-head">
        <h2 className="section-title">Observer's Log</h2>
        <span className="section-note">nightly · handwritten by instrument</span>
      </div>

      <motion.div
        className="obs-log"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7 }}
      >
        <p className="obs-dateline">{dateline}</p>
        {cloudy && (
          <p className="obs-line">
            Overcast. The instruments returned nothing tonight — the rate limit
            rolled in like fog. Entry to be completed when the sky clears.
          </p>
        )}
        {!lines && !cloudy && <p className="obs-line pulse">The nib hovers over the page…</p>}
        {lines && lines.map((l, i) => (
          <motion.p
            key={i}
            className="obs-line"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 + i * 0.25 }}
          >
            {l}
          </motion.p>
        ))}
        <p className="obs-signature">— the resident astronomer ✦</p>
      </motion.div>
    </section>
  );
}
