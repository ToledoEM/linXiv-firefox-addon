# linXiv Firefox clipper

Unofficial Firefox addon that saves what you're reading into [linXiv](https://github.com/linxiv-dev/linXiv). Click the toolbar button on any page and it works out the metadata from that page, the way Zotero Connector does. It reads embedded tags, looks up any identifier it finds, and falls back to the page's title and URL. On an article page it saves the metadata and you attach the PDF yourself in linXiv. On a PDF open full page, it sends the file to linXiv, which reads the title, authors and DOI from it and checks them against Crossref.

Saving to the desktop app, linXiv-web and linxiv-headless is the goal. The addon is still being built: today it only handles arXiv pages and the desktop app, and this fork hasn't been tested end to end.

## Requirements

Firefox 140 or later and the linXiv desktop app. To build it, you need Node 22 or later and pnpm 10.

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
