# 🔭 The Observatory — Launch Kit

Everything below is ready to copy-paste. Follow the schedule at the bottom — one big channel per day, never two launches on the same day (you can't tend two comment sections at once, and early engagement is what decides all of them).

---

## 1. Hacker News — Show HN (highest priority)

**Where:** news.ycombinator.com/submit
**When:** Tuesday–Thursday, 8:00–10:00am ET. Do NOT post on a Friday or weekend.
**URL to submit:** `https://gitobservatory.com` (no www, no UTM — HN strips/penalizes tracking params)

**Title (pick one — 80 char limit):**

> Show HN: GitHub charted as a night sky, with supernova detection

Alternates if you want to test the framing:

> Show HN: I turned GitHub trending into a planetarium. It costs $0 to run
> Show HN: Every GitHub star is a real star – a night sky of tonight's rising repos

**First comment (post this within 60 seconds of submitting — this is your pitch, since Show HN URLs have no text body):**

> Hi HN! I built The Observatory — a site that charts GitHub as a night sky, where tonight's fastest-rising repos become the brightest stars.
>
> A few things that might interest you technically:
>
> **It costs $0 to run.** No backend, no database, no AI APIs, no tracking. Everything runs client-side against GitHub's free API, with localStorage caching tuned around the unauthenticated rate limits (10 search req/min). You can optionally paste your own PAT (stored in localStorage only, no scopes) to lift the limits.
>
> **Supernova Watch** compares tonight's star gain against each repo's lifetime daily average. A 10×+ spike gets a real astronomical designation (SN 2026-07-14A) and a Δ-magnitude computed the way astronomers actually do it: 2.5·log₁₀ of the flux ratio. Classifications run from Flare to Type Ia.
>
> **The natural-language search is a hand-written parser, not an LLM.** "rust cli tools >1k stars this year" compiles to a GitHub search query via rules for languages, star ranges, time windows, and sort. It shows "understood as" chips so you can see exactly how it read you.
>
> **Star history without an API for it:** GitHub has no star-history endpoint, so the Spectrograph samples the stargazer record with paginated probes to reconstruct the cumulative curve.
>
> There's a Field Notes page (✎ in the masthead) documenting every trick: https://gitobservatory.com?notes=open
>
> Point the telescope at any month back to 2008, type your username into Your Sky to see your repos as a constellation, or just let the planetarium fly you through tonight's top five. Happy to answer anything!

**HN survival rules:**

- Reply to every comment in the first 3 hours. Substantive, technical, zero marketing-speak.
- Someone WILL ask "why not just use GitHub trending?" — answer: trending shows one day with no history, no archive, no per-repo baselines; the Observatory keeps the archive back to 2008 and detects anomalies against lifetime averages.
- Someone WILL find a bug. Thank them, fix it live if you can, reply "fixed — thanks!" Nothing plays better on HN.
- Do not ask friends to upvote (HN detects voting rings and kills the post).
- If it doesn't take off, you may repost once after ~2 weeks with a different title. HN allows this for Show HN.

---

## 2. Reddit

**Rules of engagement:** one subreddit per day. Read each sub's self-promotion policy the morning you post. Reply to every comment. Never post the same title twice.

### r/InternetIsBeautiful — biggest traffic potential

**Title:**
> A site that charts GitHub as a night sky — tonight's fastest-rising repos become the brightest stars, and repos that suddenly explode get real supernova designations

**Body:** none (link post). Add a top comment:

> Creator here — a few things to try: type any GitHub username into "Your Sky" to see your repos drawn as a constellation, or point the telescope at the month you started programming. The planetarium mode (top right) flies you through tonight's top five. It's free, no signup, no tracking — it runs entirely in your browser.

### r/webdev — technical build story

**Title:**
> I built a GitHub "night sky" that runs 100% client-side for $0 — no backend, no DB, no AI APIs. Here's how

**Body:**

> The Observatory (gitobservatory.com) charts GitHub as a night sky: tonight's fastest-rising repos are the brightest stars, repos gaining 10×+ their lifetime daily average get supernova designations with real Δ-magnitudes, and there's an archive back to 2008.
>
> The interesting constraint: I wanted it to cost literally $0 forever. That forced some fun engineering —
>
> - Everything runs in the browser against GitHub's free API. localStorage caching is tuned around the unauthenticated limits (10 search req/min, 60 core req/hr).
> - The natural-language search ("rust cli tools >1k stars this year") is a hand-written rule-based parser that compiles English to GitHub search syntax. No LLM.
> - GitHub has no star-history API, so I reconstruct each repo's curve by sampling the stargazer record with paginated probes.
> - GitHub's trending page has no API and blocks CORS, so it's proxied through a Vercel rewrite (zero compute).
> - Stack: React 19 + Vite + Framer Motion.
>
> Every trick is documented in a Field Notes overlay on the site: gitobservatory.com?notes=open
>
> Happy to answer questions about any of it.

### r/SideProject

**Title:**
> My side project: GitHub as a night sky. Supernova detection, a telescope back to 2008, and your account drawn as a constellation — $0/month to run

**Body:** short version of the r/webdev body + one line on the origin ("started as an experiment, turned into a full astronomical instrument").

### r/github

**Title:**
> I made a night-sky view of GitHub — trending as constellations, star-spike "supernovae," and star history for any repo without the API that GitHub never shipped

**Body:** link + the technical top-comment from r/InternetIsBeautiful, adjusted.

---

## 3. Product Hunt

**When:** launch at 12:01am PT, Tuesday–Thursday. Clear your calendar that day — you need to answer comments for ~12 hours.

**Name:** The Observatory
**Tagline (60 chars):** `GitHub charted as a night sky. Every star is a real star.`
**Description:**

> The Observatory turns GitHub into an astronomical instrument. Tonight's fastest-rising repos become the brightest stars. Repos that suddenly explode get real supernova designations (SN 2026-07-14A) with Δ-magnitudes calculated the way astronomers do it. Point the telescope at any month back to 2008, get a stellar classification for any repo (Protostar → Hypergiant), or see your own GitHub account drawn as a constellation. 100% client-side, $0 to run, no signup, no tracking.

**Topics:** Developer Tools, GitHub, Open Source, Data Visualization
**Gallery assets needed (prepare before launch):**

1. The og-image.png card (already done)
2. Screen recording of the planetarium Night Tour → export as GIF (first gallery slot; PH autoplays it)
3. Screenshots: Supernova Watch, the Spectrograph curve, Your Sky constellation, the Telescope pointed at an old month

**Maker's first comment:**

> Hey Product Hunt! 👋 The Observatory started as an experiment — "what if GitHub trending looked like the night sky?" — and turned into a full astronomical instrument.
>
> My favorite part is what it doesn't have: no backend, no database, no AI APIs, no tracking, no signup. It costs $0 to run — everything happens in your browser against GitHub's free API. Even the natural-language search is a hand-written parser.
>
> Things to try first:
> ⭐ Type your GitHub username into "Your Sky" — your repos, drawn as a constellation
> 💥 Check Supernova Watch — repos detonating 10×+ above their lifetime average, with real astronomical designations
> 🔭 Point the Telescope at the month you started coding
>
> For the engineers asking "wait, how?" — Field Notes documents every trick: gitobservatory.com?notes=open
>
> I'd love to hear what constellation you find!

---

## 4. Newsletter submissions

Send these the same week as the HN launch (a front-page HN run makes editors say yes). Short pitches — editors skim.

### TLDR Web Dev — tldr.tech (submission form on site)

> **The Observatory — GitHub charted as a night sky (gitobservatory.com)**
> Tonight's fastest-rising repos become the brightest stars. Repos spiking 10×+ their lifetime average get real supernova designations with Δ-magnitudes. Includes a trending archive back to 2008, star-history curves for any repo, and your GitHub account drawn as a constellation. 100% client-side, $0 to run, no signup.

### JavaScript Weekly / Frontend Focus — cooperpress.com/publications (submit via their form)

> Subject: The Observatory — GitHub as a night sky, built with React 19 + Vite, $0 to run
>
> Hi — I built The Observatory (gitobservatory.com), a client-side React 19 + Vite app that charts GitHub as a night sky: trending repos as stars, statistical star-spikes as supernovae with real astronomical math, and a trending archive back to 2008. No backend at all — the interesting part is the engineering around GitHub's free API rate limits, a hand-written English→search-query parser, and reconstructing star history from the stargazer record (there's no API for it). All documented in a Field Notes overlay: gitobservatory.com?notes=open. Thought it might suit an issue.

### Bytes (bytes.dev) — reply to any issue or use the contact form; same pitch as JS Weekly, more casual tone.

### Console.dev — console.dev/submit

> The Observatory — a free, open, client-side tool that charts GitHub as a night sky. Supernova detection for anomalous star spikes, trending archive to 2008, star-history spectrograph for any repo, natural-language repo search via a rule-based parser. $0 infra, no signup, no tracking.

---

## 5. X/Twitter thread

Post 9–11am ET. First tweet is everything — no links in tweet 1 (put the link in tweet 2 or last; X deprioritizes link tweets).

> **1/** Every GitHub star is a real star. 🔭
>
> I built a site that charts GitHub as a night sky — tonight's fastest-rising repos become the brightest stars.
>
> And when a repo suddenly explodes? It gets a real supernova designation. A thread:

> **2/** This is Supernova Watch.
>
> When a repo gains 10×+ its lifetime daily average, that's not a good day — that's a detonation.
>
> It gets a designation (SN 2026-07-14A) and a Δ-magnitude: 2.5·log₁₀ of the flux ratio. The way astronomers actually calculate it.
>
> [screenshot]

> **3/** The Telescope: point it at any month back to 2008 and see whose stars were shining.
>
> GitHub won't show you this. Trending has no memory. The Observatory does.
>
> [screenshot]

> **4/** The Spectrograph: type any repo, get its full star-history curve and a stellar classification — Protostar → Hypergiant.
>
> Fun fact: GitHub has no star-history API. This is reconstructed by sampling the stargazer record.
>
> [screenshot]

> **5/** Your Sky: your own GitHub account, drawn as a constellation.
>
> What does yours look like? 👇
>
> [screenshot of YOUR constellation]

> **6/** The part engineers don't believe: it costs $0 to run.
>
> No backend. No database. No AI APIs. No tracking.
>
> Even the natural-language search — "rust cli tools >1k stars this year" — is a hand-written parser. Everything runs in your browser.

> **7/** Every trick is documented in the Field Notes: star-history sampling, the English→query compiler, the supernova math, cache-as-weather.
>
> 🔭 gitobservatory.com
> ✎ gitobservatory.com?notes=open
>
> Go find your constellation.

---

## 6. Launch schedule (starting this week)

| Day | Action |
|---|---|
| **Day 1 (today)** | Post the LinkedIn post (revised version, link in pinned comment). Run Post Inspector first. |
| **Day 2** | Prepare assets: planetarium GIF, 4 screenshots, personal constellation screenshot. Verify site under load basics. |
| **Day 3 (Tue/Wed/Thu)** | **Show HN**, 8–10am ET. First comment ready in clipboard. Clear your morning. |
| **Day 4** | X/Twitter thread (ride any HN momentum). Submit all 4 newsletter pitches. |
| **Day 5** | r/InternetIsBeautiful. |
| **Day 8** | r/webdev (build-story post). |
| **Day 9** | r/SideProject. |
| **Day 10** | r/github. |
| **Day 12–14 (Tue–Thu)** | **Product Hunt** launch, 12:01am PT. |
| **Week 3+** | Build "Share my constellation" viral loop. Submit to awesome-lists (awesome-github, awesome-react). Write a dev.to/Hashnode post-mortem: "How my $0 GitHub night-sky hit HN front page." |

**Universal rules:** never launch two channels the same day · reply to every comment within the first 3 hours · each channel gets its own framing (HN = engineering, Reddit r/IIB = wonder, PH = product, X = story) · the ?notes=open Field Notes link is your credibility weapon everywhere engineers gather.
