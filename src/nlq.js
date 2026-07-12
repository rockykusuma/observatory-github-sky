// Natural-language → GitHub search query. Pure rules, zero cost, zero
// latency. Structured so an LLM (BYOK) could replace parseQuery() later:
// the component only depends on the parsed-filter shape returned here.

const MONTHS = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

const LANG_ALIASES = {
  javascript: "JavaScript", js: "JavaScript",
  typescript: "TypeScript", ts: "TypeScript",
  python: "Python", py: "Python",
  rust: "Rust",
  golang: "Go",
  java: "Java",
  "c++": "C++", cpp: "C++",
  "c#": "C#", csharp: "C#",
  swift: "Swift",
  kotlin: "Kotlin",
  ruby: "Ruby",
  zig: "Zig",
  php: "PHP",
  lua: "Lua",
  dart: "Dart",
  html: "HTML",
  css: "CSS",
  bash: "Shell",
};

// Short words that are languages only with context ("in go", "go repos").
const AMBIGUOUS = { go: "Go", c: "C", shell: "Shell", r: "R" };

const STOPWORDS = new Set([
  "show", "me", "find", "give", "get", "list", "search", "for", "the", "a", "an",
  "repos", "repositories", "repository", "repo", "projects", "project",
  "with", "that", "are", "is", "in", "of", "and", "or", "written", "using",
  "made", "built", "born", "created", "new", "some", "any", "top", "best",
  "stars", "star", "starred", "please", "what", "which", "whats",
]);

// "5k" → 5000, "1.2m" → 1200000, "800" → 800
function num(s) {
  const m = String(s).toLowerCase().replace(/,/g, "").match(/^([\d.]+)\s*(k|m)?$/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return Math.round(n * (m[2] === "k" ? 1e3 : m[2] === "m" ? 1e6 : 1));
}

const NUM = "([\\d.,]+\\s*[km]?)";
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysAgoIso = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return iso(d);
};

/**
 * @returns {{
 *   language: string|null,
 *   stars: {min: number|null, max: number|null},
 *   created: {from: string|null, to: string|null, label: string|null},
 *   activeWithinDays: number|null,
 *   sort: "stars"|"forks"|"updated",
 *   terms: string[],
 * }}
 */
export function parseQuery(input) {
  let s = ` ${String(input).toLowerCase().trim()} `;
  const out = {
    language: null,
    stars: { min: null, max: null },
    created: { from: null, to: null, label: null },
    activeWithinDays: null,
    sort: "stars",
    terms: [],
  };
  const eat = (re, fn) => {
    s = s.replace(re, (...m) => {
      fn(...m);
      return " ";
    });
  };

  // ---- stars ----
  eat(new RegExp(`between\\s+${NUM}\\s+and\\s+${NUM}\\s+stars?`, "g"), (_, a, b) => {
    out.stars.min = num(a);
    out.stars.max = num(b);
  });
  eat(new RegExp(`(?:over|above|more than|at least|>=?)\\s*${NUM}\\s*stars?`, "g"), (_, a) => {
    out.stars.min = num(a);
  });
  eat(new RegExp(`${NUM}\\+\\s*stars?`, "g"), (_, a) => {
    out.stars.min = num(a);
  });
  eat(new RegExp(`(?:under|below|less than|fewer than|<=?)\\s*${NUM}\\s*stars?`, "g"), (_, a) => {
    out.stars.max = num(a);
  });
  eat(new RegExp(`${NUM}\\s*stars?`, "g"), (_, a) => {
    out.stars.min = num(a); // bare "1k stars" → at least that bright
  });

  // ---- time window ----
  const now = new Date();
  const setWindow = (from, to, label) => {
    out.created = { from, to, label };
  };

  eat(/\b(?:this|past|last)\s+week\b/g, () => setWindow(daysAgoIso(7), null, "past week"));
  eat(/\b(?:this|past|last)\s+month\b/g, () => setWindow(daysAgoIso(30), null, "past month"));
  eat(/\b(?:this|past|last)\s+year\b/g, () => setWindow(daysAgoIso(365), null, "past year"));
  eat(/\b(?:past|last)\s+(\d+)\s+days?\b/g, (_, n) => setWindow(daysAgoIso(+n), null, `past ${n} days`));
  eat(/\b(?:past|last)\s+(\d+)\s+months?\b/g, (_, n) => setWindow(daysAgoIso(+n * 30), null, `past ${n} months`));
  eat(/\b(?:past|last)\s+(\d+)\s+years?\b/g, (_, n) => setWindow(daysAgoIso(+n * 365), null, `past ${n} years`));
  eat(/\btoday\b/g, () => setWindow(daysAgoIso(1), null, "today"));

  // "march 2023" / "in march 2023"
  eat(
    new RegExp(`\\b(?:in\\s+|from\\s+)?(${Object.keys(MONTHS).join("|")})\\s+(20[0-2]\\d)\\b`, "g"),
    (_, mo, yr) => {
      const m = MONTHS[mo];
      const last = new Date(+yr, m, 0).getDate();
      setWindow(`${yr}-${pad(m)}-01`, `${yr}-${pad(m)}-${last}`, `${mo} ${yr}`);
    }
  );
  // "since 2023" / "after 2023"
  eat(/\b(?:since|after)\s+(20[0-2]\d)\b/g, (_, yr) => setWindow(`${yr}-01-01`, null, `since ${yr}`));
  // "before 2015"
  eat(/\bbefore\s+(20[0-2]\d)\b/g, (_, yr) => setWindow(null, `${+yr - 1}-12-31`, `before ${yr}`));
  // bare year "2023" / "in 2023" / "from 2023"
  eat(/\b(?:in\s+|from\s+)?(200[8-9]|201\d|202\d)\b/g, (_, yr) => {
    if (+yr <= now.getFullYear()) setWindow(`${yr}-01-01`, `${yr}-12-31`, `in ${yr}`);
  });

  // ---- activity ----
  eat(/\b(?:actively\s+maintained|active|maintained|alive)\b/g, () => {
    out.activeWithinDays = 30;
  });

  // ---- sort ----
  eat(/\b(?:most|sort by)\s+fork(?:s|ed)?\b/g, () => (out.sort = "forks"));
  eat(/\brecently\s+(?:updated|pushed)\b/g, () => (out.sort = "updated"));

  // ---- language ----
  for (const [alias, lang] of Object.entries(LANG_ALIASES)) {
    const re = new RegExp(`(?<=[\\s,])${alias.replace(/[+#]/g, "\\$&")}(?=[\\s,])`, "g");
    if (re.test(s)) {
      out.language = lang;
      eat(re, () => {});
      break;
    }
  }
  if (!out.language) {
    for (const [alias, lang] of Object.entries(AMBIGUOUS)) {
      // needs context: "in go", "go repos", "go projects", "go code/tools"
      const re = new RegExp(`\\b(?:in\\s+${alias}|${alias}\\s+(?=repos?|repositories|projects?|code|tools?|libs?|libraries))\\b`, "g");
      if (re.test(s)) {
        out.language = lang;
        eat(re, () => {});
        break;
      }
    }
  }

  // ---- leftover terms ----
  out.terms = s
    .split(/[\s,.!?;:()]+/)
    .filter(Boolean)
    .filter((w) => !STOPWORDS.has(w))
    .slice(0, 4);

  return out;
}

/** Parsed filters → GitHub search API params. */
export function toSearch(p) {
  const parts = [];
  if (p.terms.length) parts.push(p.terms.join(" "));
  if (p.language) parts.push(`language:"${p.language}"`);

  const { min, max } = p.stars;
  if (min != null && max != null) parts.push(`stars:${min}..${max}`);
  else if (min != null) parts.push(`stars:>=${min}`);
  else if (max != null) parts.push(`stars:<=${max}`);

  const { from, to } = p.created;
  if (from && to) parts.push(`created:${from}..${to}`);
  else if (from) parts.push(`created:>${from}`);
  else if (to) parts.push(`created:<${to}`);

  if (p.activeWithinDays) parts.push(`pushed:>${daysAgoIso(p.activeWithinDays)}`);

  return { q: parts.join(" "), sort: p.sort };
}

/** Human-readable chips describing how the query was understood. */
export function describe(p) {
  const chips = [];
  if (p.terms.length) chips.push({ k: "about", v: p.terms.join(" ") });
  if (p.language) chips.push({ k: "spectrum", v: p.language });
  const { min, max } = p.stars;
  if (min != null && max != null) chips.push({ k: "luminosity", v: `★ ${min}–${max}` });
  else if (min != null) chips.push({ k: "luminosity", v: `★ ≥ ${min}` });
  else if (max != null) chips.push({ k: "luminosity", v: `★ ≤ ${max}` });
  if (p.created.label) chips.push({ k: "born", v: p.created.label });
  if (p.activeWithinDays) chips.push({ k: "pulse", v: `active ${p.activeWithinDays}d` });
  if (p.sort !== "stars") chips.push({ k: "order", v: `by ${p.sort}` });
  return chips;
}
