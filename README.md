# 🔭 The Observatory

**GitHub's night sky, charted daily.** Every GitHub star is a real star. Watch tonight's brightest repositories, and point the telescope at any month since 2008.

The Observatory reimagines GitHub trending as an astronomical instrument: the fastest-rising repos become the brightest stars in tonight's sky, ranked by stars gained per day and cross-referenced against archival queries over repositories born in each window.

## Features

- **Hero champion** — tonight's brightest repo, front and center.
- **Daily Almanac** — the day's headline trending signal at a glance.
- **Ask the Sky** — natural-language search: "rust cli tools >1k stars this year" becomes a GitHub catalog query via a zero-cost rule-based parser (languages, star ranges, time windows, activity, sort). Shows "understood as" chips so you see exactly how it read you.
- **Sky Chart** — GitHub's official trending signal (stars gained per day).
- **Supernova Watch** — transient-event survey: tonight's star gain vs. each repo's lifetime daily average. Spikes of 10×+ get a proper designation (SN 2026-07-12A), a Δ-magnitude (2.5·log₁₀ ratio), and a classification from Flare to Type Ia.
- **Newborn Stars** — the brightest repositories born in the current window.
- **Deep Field** — long-exposure hidden-gem survey: repos under 400 stars and 90 days old, scored on fork depth, push freshness, and issue traffic — signal before luminosity.
- **The Telescope** — an archive you can point at any month back to 2008.
- **This Night in History** — for every year since 2008, the brightest repo born within three nights of tonight's date.
- **The Spectrograph** — point at any `owner/repo` (or GitHub URL): a cumulative star-history curve sampled from the stargazer record, a stellar classification (Protostar → Hypergiant), lifetime star velocity, and vital signs.
- **Eclipse Watch** — head-to-head repo rivalries (Vue vs React, PyTorch vs TensorFlow, Deno vs Node, Zed vs VS Code, or any `owner/repo` pair) with a proportional gap bar, lifetime star velocity, and an extrapolated "eclipse date."
- **Your Sky** — enter any GitHub username: their repos drawn as a personal constellation, combined luminosity, brightest star, and vitals.
- **Observer's Log** — a nightly journal entry composed (templated, no LLM) from the night's data: champion, total sky brightening, dominant language.
- **Planetarium mode** — a living sky: a cinematic Night Tour flies through tonight's top five, then hands over a zoomable, pannable 3D dome (wheel/pinch/drag) where depth = repo mass, labels resolve as you zoom, supernovae detonate on the biggest gainers, and shooting stars are real newborn repos.
- **Sky Atlas** — sticky scroll-spy navigation across all instruments.
- **Deep links** — every instrument is shareable: `?ask=rust+cli+tools`, `?scope=owner/repo`, `?sky=2015-03`, `?vs=a/b,c/d`, `?observer=username`.
- **Bring your own token** — optional GitHub PAT (⚙ in the masthead, localStorage only, no scopes needed) lifts rate limits from 10→30 search req/min and 60→5000 core req/hr.

## Tech

- [React 19](https://react.dev/) + [Vite](https://vite.dev/)
- [Framer Motion](https://www.framer.com/motion/) for animation
- Client-side `localStorage` caching to respect GitHub's unauthenticated search rate limit (10 req/min)

## Data sources

Rankings blend the [GitHub Search API](https://docs.github.com/en/rest/search) with the trending page at [github.com/trending](https://github.com/trending). GitHub's trending page has no public API and blocks browser CORS, so it is proxied through the Vite dev server (see `vite.config.js`). In production, replicate this with a serverless rewrite (Vercel/Netlify).

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
npm run preview  # preview the production build
```

## Deployment note

The `/gh-trending` proxy defined in `vite.config.js` only runs in the Vite dev server. To deploy, add an equivalent rewrite at your host:

- **Vercel** — a `vercel.json` rewrite from `/gh-trending/:path*` to `https://github.com/trending/:path*`.
- **Netlify** — a `netlify.toml` redirect with `status = 200` (proxy) for the same path.

---

*Built under clear skies.*
