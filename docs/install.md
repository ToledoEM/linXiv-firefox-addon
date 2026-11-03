# Install

The addon isn't on addons.mozilla.org yet, so you build it from source and load it as a temporary add-on. Firefox removes a temporary add-on when it restarts, and you load it again the same way.

## Requirements

- Firefox 140 or later. The addon has been tested on Firefox 159.
- Node 22 or later and pnpm 10, to build it.
- A linXiv to save to. See [Backends](backends.md).

## Build

```sh
pnpm install
pnpm build
```

The build writes the addon to `dist/`.

## Load it in Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Choose **Load Temporary Add-on**.
3. Pick `dist/manifest.json`.

The addon adds a toolbar button named **Clip to linXiv**.

## Choose where to save

The addon saves to the desktop app until you change it. To change it, open the popup and click **Settings**, then follow [Backends](backends.md).
