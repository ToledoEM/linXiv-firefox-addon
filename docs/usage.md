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
| `linxiv-headless`, linXiv-web | The addon requests the PDF again using your browser session and uploads the file. The limit is 100 MB |
| Desktop app | The addon passes the URL and the app downloads the file. Links that need your login fail, and arXiv PDF links save metadata only. Signed links are refused, with a message to save from the article page and attach the PDF in linXiv |

If the file turns out not to be a PDF, the addon saves the tab as an ordinary page. With the desktop app, the same happens to any URL that doesn't end in `.pdf`.

### Allow and save

If Firefox blocks the request, the popup says it needs your permission and shows **Allow and save**. Click it and accept the Firefox prompt, and the save carries on. If the page still can't be read with permission, as on addons.mozilla.org, the addon saves it as an ordinary page.

### Security checks

Some sites answer the addon's request with a security check page, even though the PDF is open in your tab. ScienceDirect does this. The addon opens the link in a new background tab and retries for about 15 seconds. The tab closes by itself if the check passes.

If the check needs you, solve it in the new tab, then press **Save to linXiv** there. Clicking in the new tab closes the popup, so you need that second press. The addon saves nothing from a security check page.

### Expired links

`The PDF link answered HTTP 403`, or a similar status, means the link may have expired or need a login. Reload the PDF tab and try again. `The PDF link answered with a web page` means the same for a signed link, and shows what the link returned.

## After saving

| Backend | What you see |
|---|---|
| `linxiv-headless` | The popup stays open and shows the saved id, or the title for a PDF |
| linXiv-web | The popup stays open and says whether the paper is new, already in your library, or had its PDF added. Papers also join the reading list **Imported - to check** |
| Desktop app | The popup closes when the link is sent. The addon gets no reply, so check the app |
