# Using the addon

Click **Clip to linXiv** in the toolbar. The addon reads the current tab only when you click, and shows what it found: type, title, authors, identifiers, journal, date and abstract. Check it, then click **Save to linXiv**.

The popup also shows where the title came from, and lists authors or a date under **Not found** when an item other than a web page has none. The line at the bottom names the backend you're saving to and links to **Settings**.

## Article and web pages

The addon saves metadata and no PDF. It doesn't follow PDF links on the page. When the save finishes, attach the PDF yourself in linXiv.

If nothing on the page identifies it, the record is a web page with the page's title and URL.

## Pages that list several papers

A page can list several items, such as search results or a reference list. The popup then shows **Also on this page**, with a checkbox for each item and one for **This page**. **This page** starts ticked and the others don't. Everything you tick is saved together.

## PDFs open full page

When a PDF fills the tab, Firefox doesn't let the addon read the page, so the popup shows only what the URL and tab title give. The final metadata comes from linXiv.

| Backend | What happens on save |
|---|---|
| `linxiv-headless`, linXiv-web | The addon downloads the PDF using your browser session and uploads the file. The limit is 100 MB |
| Desktop app | The addon passes the URL and the app downloads the file. Links that need your login fail, and arXiv PDF links save metadata only |

If the file turns out not to be a PDF, the addon saves the tab as an ordinary page. With the desktop app, the same happens to any URL that doesn't end in `.pdf`.

### Allow and save

If Firefox blocks the PDF download, the popup says it needs your permission and shows **Allow and save**. Click it and accept the Firefox prompt, and the save carries on.

### Expired links

`The PDF link answered HTTP 403`, or a similar status, means the link may have expired or need a login. Reload the PDF tab and try again.

## After saving

| Backend | What you see |
|---|---|
| `linxiv-headless`, linXiv-web | The popup stays open and shows the saved id, or the title for a PDF |
| Desktop app | The popup closes when the link is sent. The addon gets no reply, so check the app |
