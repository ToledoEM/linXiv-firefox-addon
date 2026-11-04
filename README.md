# linXiv Firefox clipper

Unofficial Firefox addon that saves what you're reading into [linXiv](https://github.com/linxiv-dev/linXiv). Click the toolbar button on any page and it works out the metadata from that page, the way Zotero Connector does. It reads embedded tags, looks up any identifier it finds, and falls back to the page's title and URL. On an article page it saves the metadata and you attach the PDF yourself in linXiv. On a PDF open full page, it sends the file to linXiv, which reads the title, authors and DOI from it and checks them against Crossref.

Saving works with the desktop app, linxiv-headless and linXiv-web. It was tested on Firefox 159, and on Zen and LibreWolf for macOS. The addon isn't on addons.mozilla.org yet, so you load it yourself (see Development).

## Requirements

Firefox 140 or later, and one of:

- The linXiv desktop app.
- A linxiv-headless server.
- A linXiv-web server with the Browser add-on routes. These aren't in a release yet. Create the token in linXiv-web under Settings, Library, Browser add-on.

To build the addon, you need Node 22 or later and pnpm 10.

## PDFs

Firefox doesn't let addons read its PDF viewer, so the addon requests the PDF's link again. The first save from a new PDF host may ask for access to it through `Allow and save`.

| Backend | What happens |
|---|---|
| linxiv-headless, linXiv-web | The addon sends the file. If the site shows a security check, solve it in the tab that opens, then press Save again |
| Desktop app | The app downloads the link itself, so arXiv PDFs save metadata only. Protected links, such as ScienceDirect's, are refused: save from the article page and attach the PDF in linXiv |

Signed links are never stored in a record.

## Development

```sh
pnpm install
git config core.hooksPath .githooks
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

To try a build, open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on** and pick `dist/manifest.json`. Firefox removes the addon when it restarts.

Commit messages follow Conventional Commits, checked by `.githooks/commit-lint.sh`. Branches are named `<type>/<slug>`.

## License

Apache-2.0. Forked from `browser-extension/` in linXiv, with its history.
