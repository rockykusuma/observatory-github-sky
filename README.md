# 🔭 The Observatory

**GitHub's night sky, charted daily.** Every GitHub star is a real star. Watch tonight's brightest repositories, and point the telescope at any month since 2008.

The Observatory reimagines GitHub trending as an astronomical instrument: the fastest-rising repos become the brightest stars in tonight's sky, ranked by stars gained per day and cross-referenced against archival queries over repositories born in each window.

## Features

- **Hero champion** — tonight's brightest repo, with a downloadable 1200×630 "champion card" (seeded starfield, nebula gradients, the repo avatar in a gold frame) ready for X/LinkedIn.
- **Daily Almanac** — the day's headline trending signal at a glance.
- **Sky Chart** — GitHub's official trending signal (stars gained per day).
- **Newborn Stars** — the brightest repositories born in the current window.
- **The Telescope** — an archive you can point at any month back to 2008.
- **Eclipse Watch** — head-to-head repo rivalries (Vue vs React, PyTorch vs TensorFlow, Deno vs Node, Zed vs VS Code, or any `owner/repo` pair) with a proportional gap bar, lifetime star velocity, and an extrapolated "eclipse date."
- **Planetarium mode** — full-screen immersive view.

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
