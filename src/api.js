// GitHub search API client with localStorage caching.
// Unauthenticated limit: 10 search requests/minute — caching matters.

const API = "https://api.github.com/search/repositories";

// ---------- optional personal access token (BYO, localStorage only) ----------
// Unauthenticated: 10 search req/min, 60 core req/hr. With any PAT (no scopes
// needed): 30 search req/min, 5000 core req/hr. The token never leaves the
// visitor's browser.
const TOKEN_KEY = "observatory:token";

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function setToken(t) {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t.trim());
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* fine */
  }
}

export function ghHeaders(accept = "application/vnd.github+json") {
  const h = { Accept: accept };
  const t = getToken();
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

const iso = (d) => d.toISOString().slice(0, 10);

export function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return iso(d);
}

function cacheKey(query) {
  return `observatory:${query}`;
}

function readCache(query, ttlMs) {
  try {
    const raw = localStorage.getItem(cacheKey(query));
    if (!raw) return null;
    const { at, data } = JSON.parse(raw);
    if (ttlMs !== Infinity && Date.now() - at > ttlMs) return null;
    return data;
  } catch {
    return null;
  }
}

function writeCache(query, data) {
  try {
    localStorage.setItem(cacheKey(query), JSON.stringify({ at: Date.now(), data }));
  } catch {
    /* storage full — fine */
  }
}

/**
 * Search repos created in a window, ranked by stars.
 * @param {object} opts
 * @param {string} opts.from   YYYY-MM-DD
 * @param {string} [opts.to]   YYYY-MM-DD
 * @param {string} [opts.language]
 * @param {number} [opts.perPage]
 * @param {number} [opts.ttlMs]  cache lifetime (Infinity for immutable past windows)
 */
export async function searchTopRepos({ from, to, language, perPage = 10, ttlMs = 30 * 60 * 1000 }) {
  let q = to ? `created:${from}..${to}` : `created:>${from}`;
  if (language && language !== "all") q += ` language:"${language}"`;
  const query = `${API}?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=${perPage}`;

  const cached = readCache(query, ttlMs);
  if (cached) return cached;

  const res = await fetch(query, {
    headers: ghHeaders(),
  });

  if (res.status === 403 || res.status === 429) {
    const stale = readCache(query, Infinity);
    if (stale) return stale;
    throw new Error("rate-limit");
  }
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);

  const json = await res.json();
  const items = (json.items || []).map((r) => ({
    id: r.id,
    name: r.name,
    fullName: r.full_name,
    owner: r.owner?.login ?? "",
    avatar: r.owner?.avatar_url ?? "",
    url: r.html_url,
    description: r.description,
    stars: r.stargazers_count,
    forks: r.forks_count,
    language: r.language,
    createdAt: r.created_at,
  }));
  writeCache(query, items);
  return items;
}

// ---------- AI Nebula ----------
// A cluster of the sky's AI stars. GitHub search OR-matches these terms across
// name / description / topics; sorting by stars surfaces the field's giants.
const AI_QUERY =
  "llm OR machine-learning OR deep-learning OR generative-ai OR ai-agents OR neural-network";

export const AI_MODES = [
  { id: "alltime", label: "All-Time Giants", note: "the most-starred AI repositories ever" },
  { id: "year", label: "This Year", note: "top AI repos born in the last 365 days", days: 365 },
  { id: "fresh", label: "Fresh · 90d", note: "AI repos born in the last 90 days", days: 90 },
];

// GitHub's star ranking occasionally floats star-inflated / spam repos to the
// top. Drop known offenders, plus anything that reads as fake: no description,
// no topics, and suspiciously few forks for its star count (real giants are
// forked heavily). This keeps the nebula full of actual projects.
const AI_DENYLIST = new Set(["affaan-m/ecc", "multica-ai/andrej-karpathy-skills"]);

function looksLegit(r) {
  const full = `${r.owner}/${r.name}`.toLowerCase();
  if (AI_DENYLIST.has(full)) return false;
  // Obvious star-farm: tens of thousands of stars but almost no forks. Any
  // genuine repo this popular has thousands of forks. Conservative thresholds
  // so legit fresh/viral repos are never caught.
  if (r.stars > 40000 && r.forks < 300) return false;
  return true;
}

/**
 * Search the AI corner of GitHub, ranked by stars.
 * @param {object} opts
 * @param {"alltime"|"year"|"fresh"} [opts.mode]
 * @param {number} [opts.perPage]
 */
export async function searchAIRepos({ mode = "alltime", perPage = 12, ttlMs = 30 * 60 * 1000 } = {}) {
  const m = AI_MODES.find((x) => x.id === mode) || AI_MODES[0];
  let q = AI_QUERY;
  if (m.days) q += ` created:>${daysAgo(m.days)}`;
  // Over-fetch so the quality guard can drop junk and still fill the list.
  const query = `${API}?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=40`;

  const cached = readCache(query, ttlMs);
  if (cached) return cached.slice(0, perPage);

  const res = await fetch(query, { headers: ghHeaders() });
  if (res.status === 403 || res.status === 429) {
    const stale = readCache(query, Infinity);
    if (stale) return stale.slice(0, perPage);
    throw new Error("rate-limit");
  }
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);

  const json = await res.json();
  const items = (json.items || [])
    .map((r) => ({
      id: r.id,
      name: r.name,
      owner: r.owner?.login ?? "",
      avatar: r.owner?.avatar_url ?? "",
      url: r.html_url,
      description: r.description,
      stars: r.stargazers_count,
      forks: r.forks_count ?? 0,
      language: r.language,
      createdAt: r.created_at,
      topics: (r.topics || []).slice(0, 3),
    }))
    .filter(looksLegit);
  writeCache(query, items);
  return items.slice(0, perPage);
}

/**
 * GitHub's OFFICIAL trending — repos ranked by stars gained today/this week/
 * this month, regardless of repo age. No public API exists, so we fetch the
 * trending page through the dev-server proxy (/gh-trending) and parse it.
 * @param {"daily"|"weekly"|"monthly"} since
 * @param {string} [language]
 */
export async function fetchOfficialTrending(since = "daily", language = "all") {
  const langPath =
    language && language !== "all" ? `/${encodeURIComponent(language.toLowerCase())}` : "";
  const url = `/gh-trending${langPath}?since=${since}`;

  const cached = readCache(url, 30 * 60 * 1000);
  if (cached) return cached;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`trending page ${res.status}`);
  const html = await res.text();

  const doc = new DOMParser().parseFromString(html, "text/html");
  const rows = [...doc.querySelectorAll("article.Box-row")];
  const num = (s) => parseInt(String(s).replace(/[^\d]/g, ""), 10) || 0;

  const items = rows.map((row, i) => {
    const fullName = (row.querySelector("h2 a")?.getAttribute("href") ?? "").replace(/^\//, "");
    const [owner = "", name = ""] = fullName.split("/");
    const gainedEl = [...row.querySelectorAll("span")].find((s) =>
      /stars (today|this week|this month)/.test(s.textContent)
    );
    return {
      id: fullName,
      rank: i + 1,
      owner,
      name,
      fullName,
      url: `https://github.com/${fullName}`,
      avatar: `https://avatars.githubusercontent.com/${owner}?size=128`,
      description: row.querySelector("p")?.textContent.trim() || null,
      language:
        row.querySelector('[itemprop="programmingLanguage"]')?.textContent.trim() || null,
      stars: num(row.querySelector('a[href$="/stargazers"]')?.textContent),
      forks: num(row.querySelector('a[href$="/forks"]')?.textContent),
      gained: gainedEl ? num(gainedEl.textContent) : null,
    };
  });

  if (items.length === 0) throw new Error("trending parse failed");
  writeCache(url, items);
  return items;
}

/** Fetch a single repo's live data (for Eclipse Watch). */
export async function fetchRepo(fullName) {
  const url = `https://api.github.com/repos/${fullName}`;
  const cached = readCache(url, 60 * 60 * 1000);
  if (cached) return cached;

  const res = await fetch(url, { headers: ghHeaders() });
  if (res.status === 403 || res.status === 429) {
    const stale = readCache(url, Infinity);
    if (stale) return stale;
    throw new Error("rate-limit");
  }
  if (res.status === 404) throw new Error("not-found");
  if (!res.ok) throw new Error(`repo ${res.status}`);

  const r = await res.json();
  const data = {
    fullName: r.full_name,
    name: r.name,
    owner: r.owner?.login ?? "",
    avatar: r.owner?.avatar_url ?? "",
    url: r.html_url,
    stars: r.stargazers_count,
    createdAt: r.created_at,
    language: r.language,
    description: r.description,
    forks: r.forks_count ?? 0,
    openIssues: r.open_issues_count ?? 0,
    pushedAt: r.pushed_at,
    topics: (r.topics || []).slice(0, 5),
  };
  writeCache(url, data);
  return data;
}

// ---------- Spectrograph: sampled star history ----------
// GitHub has no star-history endpoint. But the stargazers list, with the
// `star+json` media type, carries a `starred_at` timestamp per stargazer —
// and it's paginated in order. So the first stargazer on page N is star
// number (N-1)*100. Sampling a handful of pages sketches the whole
// cumulative curve for the price of ~6 requests. Pagination caps at page
// 400 (star #40,000); beyond that we bridge to today's total.
const STAR_PAGE = 100;
const STAR_PAGE_CAP = 400;

export async function fetchStarHistory(fullName, totalStars) {
  const key = `starhist:${fullName}:${Math.floor(totalStars / 500)}`;
  const cached = readCache(key, 24 * 60 * 60 * 1000);
  if (cached) return cached;

  const lastPage = Math.max(1, Math.min(Math.ceil(totalStars / STAR_PAGE), STAR_PAGE_CAP));
  const n = Math.min(6, lastPage);
  const pages = [...new Set(
    Array.from({ length: n }, (_, i) => Math.max(1, Math.round(1 + (i * (lastPage - 1)) / Math.max(1, n - 1))))
  )];

  const results = await Promise.all(
    pages.map(async (p) => {
      const res = await fetch(
        `https://api.github.com/repos/${fullName}/stargazers?per_page=${STAR_PAGE}&page=${p}`,
        { headers: ghHeaders("application/vnd.github.star+json") }
      );
      if (res.status === 403 || res.status === 429) throw new Error("rate-limit");
      if (!res.ok) return null;
      const arr = await res.json();
      const first = arr?.[0]?.starred_at;
      return first ? { t: first, s: (p - 1) * STAR_PAGE } : null;
    })
  );

  const points = results.filter(Boolean).sort((a, b) => new Date(a.t) - new Date(b.t));
  writeCache(key, points);
  return points;
}

// ---------- Ask the Sky ----------
/** Generic repo search from a prebuilt qualifier string (see nlq.js). */
export async function searchRepos({ q, sort = "stars", perPage = 12, ttlMs = 10 * 60 * 1000 }) {
  const query = `${API}?q=${encodeURIComponent(q)}&sort=${sort}&order=desc&per_page=${perPage}`;

  const cached = readCache(query, ttlMs);
  if (cached) return cached;

  const res = await fetch(query, { headers: ghHeaders() });
  if (res.status === 403 || res.status === 429) {
    const stale = readCache(query, Infinity);
    if (stale) return stale;
    throw new Error("rate-limit");
  }
  if (res.status === 422) throw new Error("bad-query");
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);

  const json = await res.json();
  const items = (json.items || []).map((r) => ({
    id: r.id,
    name: r.name,
    fullName: r.full_name,
    owner: r.owner?.login ?? "",
    avatar: r.owner?.avatar_url ?? "",
    url: r.html_url,
    description: r.description,
    stars: r.stargazers_count,
    forks: r.forks_count ?? 0,
    language: r.language,
    createdAt: r.created_at,
    pushedAt: r.pushed_at,
  }));
  writeCache(query, items);
  return items;
}

// ---------- Deep Field ----------
// One search over young, modestly-starred repos; the gem scoring happens
// client-side (fork/star depth + push freshness), so this costs a single
// request per language.
export async function searchDeepField({ language, ttlMs = 30 * 60 * 1000 } = {}) {
  let q = `created:>${daysAgo(90)} stars:40..400 fork:false`;
  if (language && language !== "all") q += ` language:"${language}"`;
  const query = `${API}?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=60`;

  const cached = readCache(query, ttlMs);
  if (cached) return cached;

  const res = await fetch(query, { headers: ghHeaders() });
  if (res.status === 403 || res.status === 429) {
    const stale = readCache(query, Infinity);
    if (stale) return stale;
    throw new Error("rate-limit");
  }
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);

  const json = await res.json();
  const items = (json.items || []).map((r) => ({
    id: r.id,
    name: r.name,
    fullName: r.full_name,
    owner: r.owner?.login ?? "",
    avatar: r.owner?.avatar_url ?? "",
    url: r.html_url,
    description: r.description,
    stars: r.stargazers_count,
    forks: r.forks_count ?? 0,
    openIssues: r.open_issues_count ?? 0,
    language: r.language,
    createdAt: r.created_at,
    pushedAt: r.pushed_at,
    topics: (r.topics || []).slice(0, 3),
  }));
  writeCache(query, items);
  return items;
}

// ---------- Your Sky ----------
/** Fetch a GitHub user's public profile (for the personal constellation). */
export async function fetchUser(username) {
  const url = `https://api.github.com/users/${encodeURIComponent(username)}`;
  const cached = readCache(url, 60 * 60 * 1000);
  if (cached) return cached;

  const res = await fetch(url, { headers: ghHeaders() });
  if (res.status === 403 || res.status === 429) {
    const stale = readCache(url, Infinity);
    if (stale) return stale;
    throw new Error("rate-limit");
  }
  if (res.status === 404) throw new Error("not-found");
  if (!res.ok) throw new Error(`user ${res.status}`);

  const u = await res.json();
  const data = {
    login: u.login,
    name: u.name,
    avatar: u.avatar_url,
    url: u.html_url,
    bio: u.bio,
    followers: u.followers,
    publicRepos: u.public_repos,
    createdAt: u.created_at,
  };
  writeCache(url, data);
  return data;
}

export function monthWindow(year, month) {
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const last = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { from, to };
}

export const LANGUAGE_COLORS = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572A5",
  Rust: "#dea584",
  Go: "#00ADD8",
  Java: "#b07219",
  C: "#555555",
  "C++": "#f34b7d",
  "C#": "#178600",
  Ruby: "#701516",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  PHP: "#4F5D95",
  Shell: "#89e051",
  HTML: "#e34c26",
  CSS: "#563d7c",
  "Jupyter Notebook": "#DA5B0B",
  Zig: "#ec915c",
  Dart: "#00B4AB",
  Lua: "#000080",
};

export const LANGUAGES = [
  "all",
  "Python",
  "TypeScript",
  "JavaScript",
  "Rust",
  "Go",
  "C++",
  "Java",
  "C#",
  "Swift",
  "Kotlin",
  "Ruby",
  "Zig",
];

export function formatStars(n) {
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k";
  return String(n);
}
