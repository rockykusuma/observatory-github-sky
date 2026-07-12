import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getToken, setToken } from "../api";

// Bring-your-own GitHub token: lifts rate limits from 10→30 search req/min
// and 60→5000 core req/hr. Stored in localStorage only — never sent anywhere
// except api.github.com.
export default function Settings() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(getToken());
  const [saved, setSaved] = useState(false);
  const active = !!getToken();

  const save = (e) => {
    e.preventDefault();
    setToken(value);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setOpen(false);
    }, 900);
  };

  return (
    <div className="settings">
      <button
        className={`btn-planetarium btn-settings ${active ? "token-on" : ""}`}
        title={active ? "GitHub token active — higher rate limits" : "Add a GitHub token for higher rate limits"}
        onClick={() => setOpen((o) => !o)}
      >
        ⚙{active && <span className="token-dot" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.form
            className="settings-panel"
            onSubmit={save}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <p className="settings-title">Clearer skies</p>
            <p className="settings-text">
              GitHub allows anonymous visitors 10 catalog queries a minute. Paste a{" "}
              <a
                href="https://github.com/settings/tokens/new?description=The%20Observatory"
                target="_blank"
                rel="noreferrer"
              >
                personal access token
              </a>{" "}
              (no scopes needed) to raise it 3×–80×. Stored only in your browser,
              sent only to api.github.com.
            </p>
            <input
              className="select settings-input"
              type="password"
              placeholder="github_pat_… or ghp_…"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoComplete="off"
            />
            <div className="settings-actions">
              <button type="submit" className="btn-planetarium">
                {saved ? "✓ saved" : value ? "save" : "clear"}
              </button>
              <button type="button" className="settings-close" onClick={() => setOpen(false)}>
                close
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
