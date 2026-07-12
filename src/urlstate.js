// Shareable deep links: every instrument reads its state from the URL on
// mount and writes it back on interaction, so any view can be sent as a link.

export function getParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}

export function setParam(key, value) {
  const url = new URL(window.location.href);
  if (value == null || value === "") url.searchParams.delete(key);
  else url.searchParams.set(key, value);
  window.history.replaceState(null, "", url);
}

/** Scroll a deep-linked section into view once its data has had a beat to render. */
export function revealSection(id) {
  setTimeout(() => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 500);
}
