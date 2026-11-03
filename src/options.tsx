import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

import { createBackend, DEFAULT_SETTINGS, DEFAULT_URLS } from "./backends/index.ts";
import { originPattern } from "./backends/http.ts";
import type { BackendKind, ProbeResult, Settings } from "./backends/types.ts";
import { loadSettings, saveSettings } from "./settings.ts";

import "./popup.css";

const LABELS: Record<BackendKind, string> = {
  desktop: "linXiv desktop app, on this computer",
  headless: "linxiv-headless server",
  web: "linXiv-web server",
};

function Options() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [probe, setProbe] = useState<ProbeResult | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    void loadSettings().then(setSettings);
  }, []);

  function update(next: Partial<Settings>) {
    const merged = { ...settings, ...next };
    setSettings(merged);
    setProbe(null);
    void saveSettings(merged);
  }

  function chooseKind(kind: BackendKind) {
    update({ kind, baseUrl: settings.baseUrl || DEFAULT_URLS[kind] });
  }

  async function handleTest() {
    setTesting(true);

    try {
      if (settings.kind !== "desktop") {
        // Must run directly from the click: Firefox only prompts on a user action.
        const granted = await chrome.permissions.request({ origins: [originPattern(settings.baseUrl)] });

        if (!granted) {
          setProbe({ ok: false, message: "Firefox needs permission to reach that address." });
          return;
        }
      }

      setProbe(await createBackend(settings, async () => undefined).probe());
    } catch (cause) {
      setProbe({ ok: false, message: cause instanceof Error ? cause.message : String(cause) });
    } finally {
      setTesting(false);
    }
  }

  const isServer = settings.kind !== "desktop";

  return (
    <main className="popup options">
      <h1 className="brand">linXiv Web Clipper</h1>

      <label className="field">
        <span>Save to</span>
        <select value={settings.kind} onChange={(event) => chooseKind(event.target.value as BackendKind)}>
          {(Object.keys(LABELS) as BackendKind[]).map((kind) => (
            <option key={kind} value={kind}>
              {LABELS[kind]}
            </option>
          ))}
        </select>
      </label>

      {isServer && (
        <>
          <label className="field">
            <span>Server address</span>
            <input
              type="url"
              value={settings.baseUrl}
              placeholder={DEFAULT_URLS[settings.kind]}
              onChange={(event) => update({ baseUrl: event.target.value })}
            />
          </label>

          <label className="field">
            <span>Token</span>
            <input
              type="password"
              autoComplete="off"
              value={settings.token}
              onChange={(event) => update({ token: event.target.value })}
            />
          </label>

          <p className="muted">The token is kept unencrypted in this Firefox profile.</p>
        </>
      )}

      <button
        className="save-button"
        type="button"
        disabled={testing || (isServer && !settings.baseUrl)}
        onClick={() => void handleTest()}
      >
        {testing ? "Testing…" : "Test connection"}
      </button>

      {probe && <p className={probe.ok ? "ok" : "error"}>{probe.message}</p>}
    </main>
  );
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Options root element was not found.");
}

createRoot(rootElement).render(<Options />);
