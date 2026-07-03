// GitHub search API client with localStorage caching.
// Unauthenticated limit: 10 search requests/minute — caching matters.

const API = "https://api.github.com/search/repositories";

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
    headers: { Accept: "application/vnd.github+json" },
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

  const res = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
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
