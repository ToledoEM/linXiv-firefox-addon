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

The addon doesn't send signed PDF links to the app, because the app would download them without your browser session and hold the credential.

## linxiv-headless

Enter the server address, `http://127.0.0.1:8000` by default, and your server's token.

| Action | Route |
|---|---|
| Test connection | `GET /api/status` |
| Save metadata | `POST /api/papers/import/bibtex`, base64 BibTeX in a JSON body |
| Save a PDF | `POST /api/papers/import/pdf`, base64 file and file name in a JSON body |

Don't point `linxiv-headless` at the desktop app's data directory. A library allows one writing process at a time.

## linXiv-web

!!! warning "Needs a newer server"
    The addon needs the Browser add-on routes under `/api/clip/`, which aren't in a linXiv-web release yet. An older server answers 404, and the addon says it needs a newer version.

The address defaults to `http://127.0.0.1:8086`. Each account has its own token: in linXiv-web, open Settings, then Library, and create one under **Browser add-on**. It's shown only once.

| Action | Route |
|---|---|
| Test connection | `GET /api/clip/ping`, which also checks the token |
| Save metadata | `POST /api/clip/bibtex`, multipart |
| Save a PDF | `POST /api/clip/pdf`, multipart |

A save goes to the token owner's library and adds the paper to the reading list **Imported - to check**. A paper already in the library keeps its stored record and joins the list. If it has no PDF yet, a PDF save adds one and keeps its metadata.

## Errors

| Message | Meaning |
|---|---|
| `Can't reach <address>. Is the server running?` | Nothing answered at that address, or the request was blocked |
| `Firefox hasn't been given access to your server` | Run **Test connection** in Settings and accept the prompt |
| `Firefox needs permission to reach that address` | You declined the prompt. Run **Test connection** again |
| `The server rejected the token` | `linxiv-headless` answered 401. Check the token |
| `linXiv-web rejected the token` | linXiv-web answered 401. Check the token |
| `This linXiv-web has no Browser add-on routes` | The server needs a newer version, or another service is on that address |
| `linXiv-web refused the addon: <reason>` | **Test connection** got a 403, for example because first-run setup isn't finished |
| `linXiv-web: <reason>` | A save failed, with the server's reason |
| `Saved, but ... didn't join the list` | The paper saved, but wasn't added to **Imported - to check** |
| `That address answered, but doesn't look like ...` | Another service is on that address, or you chose the wrong backend |
| `linxiv-headless accepted the request but saved nothing` | The server returned no ids for the entries it was sent |
