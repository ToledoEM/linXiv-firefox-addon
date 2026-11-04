# Development

You need Node 22 or later and pnpm 10. A fresh clone needs the commit hook switched on:

```sh
pnpm install
git config core.hooksPath .githooks
```

## Commands

| Command | What it does |
|---|---|
| `pnpm test` | Runs `src/**/*.test.ts` with Node's test runner |
| `pnpm typecheck` | Runs `tsc` |
| `pnpm build` | Builds the popup and settings pages, then the page script, into `dist/` |
| `pnpm lint` | Builds, then runs `web-ext lint` on `dist/` |
| `pnpm run run` | Builds and starts Firefox with the addon through `web-ext run` |
| `pnpm package` | Builds and packs the addon with `web-ext build` |

`web-ext` runs through `pnpm dlx` at a pinned version and isn't in the lockfile. `pnpm test` runs TypeScript directly, so imports use the `.ts` extension.

## Layout

| Path | Contents |
|---|---|
| `public/manifest.json` | Firefox manifest |
| `popup/`, `options/` | HTML entry pages |
| `src/popup.tsx` | Popup: reads the tab, shows the preview, saves |
| `src/options.tsx`, `src/settings.ts` | Settings page and stored settings |
| `src/content.ts` | Script injected into the page |
| `src/extractors/` | Metadata layers, identifiers and registry lookups |
| `src/bibtex.ts` | BibTeX entries and keys |
| `src/pdfTab.ts` | Save flow for a full-page PDF |
| `src/backends/` | The `Backend` interface and its desktop, headless and web versions |

The injected script must build as a single file, because shared chunks break injection. `vite.content.config.ts` builds it separately for that reason.

To add a backend, implement `Backend` from `src/backends/types.ts`, add it to `createBackend` in `src/backends/index.ts`, and add its label in `src/options.tsx`.

## Commits and branches

Work on a branch named `<type>/<slug>`. Commit messages follow Conventional Commits and are checked by `.githooks/commit-lint.sh`. The types are `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `chore`, `build`, `ci`, `style` and `revert`.

## CI

| Workflow | What it does |
|---|---|
| CI | Checks branch name and commit messages on pull requests, then lint, tests, typecheck and build |
| Security | `pnpm audit` |
| CodeQL | Code scanning |
| Scorecard | OpenSSF Scorecard |
| Branch cleanup | Removes old branches on a schedule |
