# Backends

A backend is the linXiv the addon saves to. Open the popup and click **Settings**, then choose one under **Save to**. The addon can't detect which one you run, so the choice is yours.

**Test connection** checks the backend you chose. For a server, Firefox first asks permission to reach that address. The addon needs that permission to save, so run the test once after setting or changing the address.

Settings save as you type and stay in this Firefox profile. The token is stored unencrypted there. It is sent only to the server address you entered, and requests to the server carry no cookies.

## Desktop app

This is the default, and it needs no address or token. The addon opens a `linxiv-clip://` link and the app takes it from there.

| Save | Link |
|---|---|
| Page metadata | `linxiv-clip://add?bibtex=<entries>` |
| Full-page PDF | `linxiv-clip://add?input=<PDF URL>` |

The link only goes one way, so the addon can't tell whether a save worked, and **Test connection** can't check anything. Look in the app to confirm. The app also drops some fields. See [Limitations](limitations.md#desktop-app).

## linxiv-headless

Enter the server address, `http://127.0.0.1:8000` by default, and your server's token.

| Action | Route |
|---|---|
| Test connection | `GET /api/status` |
| Save metadata | `POST /api/papers/import/bibtex`, base64 BibTeX in a JSON body |
| Save a PDF | `POST /api/papers/import/pdf`, base64 file and file name in a JSON body |

Don't point `linxiv-headless` at the desktop app's data directory. A library allows one writing process at a time.

## linXiv-web

!!! warning "Not working yet"
    The server rejects writes from the addon, so saves fail even when **Test connection** succeeds. That test calls `GET /api/health`, an open route, so success only means the server is reachable.

The address defaults to `http://127.0.0.1:8086`. The addon currently calls these routes:

| Action | Route |
|---|---|
| Test connection | `GET /api/health` |
| Save metadata | `POST /api/import/bibtex`, multipart |
| Save a PDF | `POST /api/pdfs/import`, multipart |

These write routes refuse a `moz-extension://` origin with 403. The popup then shows `This linXiv-web doesn't accept the addon yet`, followed by the server's reason. Nothing is saved.

### What is coming

A linXiv-web development branch adds routes for the addon under `/api/clip/`, with a separate token per account. Papers saved that way go onto a reading list named **Imported - to check**. That branch isn't merged and the addon doesn't call these routes yet, so this doesn't work today.

## Errors

| Message | Meaning |
|---|---|
| `Can't reach <address>. Is the server running?` | Nothing answered at that address, or the request was blocked |
| `Firefox hasn't been given access to your server` | Run **Test connection** in Settings and accept the prompt |
| `Firefox needs permission to reach that address` | You declined the prompt. Run **Test connection** again |
| `The server rejected the token` | `linxiv-headless` answered 401. Check the token |
| `linXiv-web asked for a login` | linXiv-web answered 401 |
| `That address answered, but doesn't look like ...` | Another service is on that address, or you chose the wrong backend |
| `linxiv-headless accepted the request but saved nothing` | The server returned no ids for the entries it was sent |
