# Limitations

## Not tested yet

- Saving a full-page PDF from Firefox. The upload to `linxiv-headless` has been tested with real PDFs, but outside Firefox, so it's unknown whether Firefox lets the popup download a PDF without first showing **Allow and save**.
- Firefox forks such as Zen and LibreWolf.
- The deep link length limit, which affects how much a desktop save can carry.

## linXiv-web

Saving doesn't work yet. See [Backends](backends.md#linxiv-web).

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
- arXiv PDF links save metadata only.
- A PDF URL that doesn't end in `.pdf` is saved as a page.

## Saved records

- A page with no date is stored with the date 1900-01-01.
- Article pages save no PDF. You attach it yourself in linXiv.

## Security and privacy

- The server token is stored unencrypted in the Firefox profile.
- Permission for a server covers every port on that host, because Firefox match patterns can't name a port.

## Distribution

The addon isn't on addons.mozilla.org. It runs as a temporary add-on, which Firefox removes on restart.
