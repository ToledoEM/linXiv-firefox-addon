# Limitations

## Firefox

- Firefox refuses script injection in its PDF viewer, so the addon can't read the PDF open in a tab and requests the link again.
- `activeTab` doesn't let the popup request a PDF's host, so the first save from a new host shows **Allow and save**.
- Some sites can't be read even with permission, such as addons.mozilla.org. These save as a page, from the tab's title and URL.
- Clicking outside the popup closes it, which likely ends a save in progress.

## Protected PDF hosts

ScienceDirect answers the addon's request with a security check page, even when the PDF is open in the tab. On a server backend, you solve the check in the tab the addon opens, then press Save again. We tested this with one ScienceDirect paper on each server backend. We don't know how long a passed check lasts or how other protected hosts behave.

## Firefox forks

Zen and LibreWolf for macOS worked with all three backends in manual testing. On Linux builds in Docker, both gave `NetworkError` on **Test connection** to `linxiv-headless` at a private IP address, and we didn't find the cause. LibreWolf also turns on HTTPS-only mode by default, including for local addresses, so a plain `http://` server may fail there. We didn't test that case.

## linXiv-web

The addon needs the Browser add-on routes, which aren't in a release yet. See [Backends](backends.md#linxiv-web).

## Full-page PDFs

These results come from importing real PDFs into `linxiv-headless` 0.7.1. The cause is in the linXiv core, not the addon: it keeps a PDF's own title and authors when both are present, and doesn't look those fields up.

| Problem | Example |
|---|---|
| Authors missing | bioRxiv 1 of 22, PLOS 3 of 12, Springer 1 of 2 |
| Year-only dates | Springer stored as `2021-01-01`, real date `2021-03-08` |
| Duplicates on re-import | Springer and arXiv get a `doi:` record and an `arxiv:` record, bioRxiv gets two `local:` records |
| Bad DOI | bioRxiv DOI stored with a stray `;` |

PDFs over 100 MB are refused.

## Desktop app

- The addon gets no reply, so it can't report a failed save.
- The app's parser drops volume, pages, publisher and keywords.
- PDF links that need your login fail, because the app downloads the file itself.
- Signed PDF links, such as ScienceDirect's, are refused by the addon. Save from the article page and attach the PDF in linXiv, or use a server backend.
- arXiv PDF links save metadata only.
- A PDF URL that doesn't end in `.pdf` is saved as a page.
- The deep link length limit is unknown. An article with a long abstract saved, but we didn't check that its abstract arrived complete.

## Saved records

- A page with no date is stored with the date 1900-01-01.
- Article pages save no PDF. You attach it yourself in linXiv.

## Security and privacy

- The server token is stored unencrypted in the Firefox profile.
- Permission for a server covers every port on that host, because Firefox match patterns can't name a port.

## Distribution

The addon isn't on addons.mozilla.org. It runs as a temporary add-on, which Firefox removes on restart.
