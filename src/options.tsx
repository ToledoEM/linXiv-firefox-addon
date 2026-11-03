import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

import { createBackend, DEFAULT_SETTINGS, DEFAULT_URLS } from "./backends/index.ts";
import { originPattern } from "./backends/http.ts";
import type { BackendKind, ProbeResult, Settings } from "./backends/types.ts";
import { loadSettings, saveSettings } from "./settings.ts";

import "./popup.css";

const LABELS: Record<BackendKind, { name: string; hint: string }> = {
  desktop: { name: "linXiv desktop app", hint: "On this computer. Saves through a linxiv-clip:// link." },
  headless: { name: "linxiv-headless", hint: "Your server, with a token." },
  web: { name: "linXiv-web", hint: "Your server. Doesn't accept the addon yet." },
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
    <main className="settings">
      <header className="settings-header">
        <h1>linXiv Web Clipper</h1>
        <p>Settings</p>
      </header>

      <fieldset className="settings-card backend-group">
        <legend>Save to</legend>

        {(Object.keys(LABELS) as BackendKind[]).map((kind) => (
          <label className="backend-option" key={kind}>
            <input
              type="radio"
              name="backend"
              value={kind}
              checked={settings.kind === kind}
              onChange={() => chooseKind(kind)}
            />
            <span>
              <strong>{LABELS[kind].name}</strong>
              <small>{LABELS[kind].hint}</small>
            </span>
          </label>
        ))}
      </fieldset>

      {isServer && (
        <section className="settings-card">
          <label className="settings-field">
            <span>Server address</span>
            <input
              type="url"
              value={settings.baseUrl}
              placeholder={DEFAULT_URLS[settings.kind]}
              onChange={(event) => update({ baseUrl: event.target.value })}
            />
          </label>

          <label className="settings-field">
            <span>Token</span>
            <input
              type="password"
              autoComplete="off"
              value={settings.token}
              onChange={(event) => update({ token: event.target.value })}
            />
            <small>The token is kept unencrypted in this Firefox profile.</small>
          </label>

          <div className="token-help">
            <h2>How to get a token</h2>

            {settings.kind === "headless" ? (
              <>
                <p>
                  linxiv-headless doesn't issue tokens. If <code>LINXIV_API_TOKEN</code> is already set on the server,
                  use that value. Otherwise:
                </p>
                <ol>
                  <li>
                    Generate one with <code>openssl rand -hex 32</code>.
                  </li>
                  <li>
                    Set it as <code>LINXIV_API_TOKEN</code> in the server's environment and restart the server.
                  </li>
                  <li>Paste the same value above and click Test connection.</li>
                </ol>
                <p>A server on 127.0.0.1 with no token set can leave this empty.</p>
              </>
            ) : (
              <>
                <ol>
                  <li>Sign in to linXiv-web and open Settings, then Library.</li>
                  <li>Under Browser add-on, create a token. It's shown only once.</li>
                  <li>Paste it above.</li>
                </ol>
                <p>Only linXiv-web versions with the Browser add-on card can do this, and saving from the addon doesn't work yet.</p>
              </>
            )}
          </div>
        </section>
      )}

      <div className="settings-actions">
        <button
          className="settings-button"
          type="button"
          disabled={testing || (isServer && !settings.baseUrl)}
          onClick={() => void handleTest()}
        >
          {testing ? "Testing…" : "Test connection"}
        </button>
      </div>

      {probe && (
        <p className={`settings-status ${probe.ok ? "is-ok" : "is-error"}`} role="status">
          {probe.message}
        </p>
      )}
    </main>
  );
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Options root element was not found.");
}

createRoot(rootElement).render(<Options />);
