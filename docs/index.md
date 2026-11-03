# linXiv Firefox clipper

The linXiv Firefox clipper is an unofficial Firefox addon that saves what you're reading into [linXiv](https://github.com/linxiv-dev/linXiv). Click its toolbar button on any page and it works out the metadata from that page, shows you the result, and saves it to the linXiv you chose.

There is no list of supported sites. A page with good metadata gives a full record, and a page with none still saves with its title and URL.

The addon is still being built. Version 0.1.0 is not on addons.mozilla.org, so you build it yourself and load it as a temporary add-on.

## What gets saved

| You have open | What the addon does |
|---|---|
| An article or any other web page | Saves metadata only. You attach the PDF yourself in linXiv |
| A page listing several papers | Offers a list to pick from, then saves the ones you tick |
| A PDF open full page | Sends the PDF to linXiv, which reads the metadata from the file |

## Where it saves

| Backend | State | Transport |
|---|---|---|
| linXiv desktop app | Works, but can't report whether a save succeeded | `linxiv-clip://` deep link |
| `linxiv-headless` | Metadata saves work from Firefox. PDF saves are tested outside Firefox only | HTTP with a bearer token |
| linXiv-web | Doesn't work yet: the server rejects writes from the addon | HTTP with a bearer token |

[Backends](backends.md) has the setup and details for each one.

## Where to start

- To install it: [Install](install.md).
- To learn what the popup does: [Using the addon](usage.md).
- To connect it to your library: [Backends](backends.md).
- To see how metadata is worked out and what leaves your browser: [How it works](how-it-works.md).
- To check what doesn't work yet: [Limitations](limitations.md).
- To change the code: [Development](development.md).

The addon is licensed under Apache-2.0. It was forked from `browser-extension/` in linXiv, with its history.
