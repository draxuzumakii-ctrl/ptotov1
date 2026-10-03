# Edi Mahendra — personal portfolio

A responsive, data-driven single-page portfolio built with semantic HTML, CSS, and vanilla JavaScript. No build step or framework required.

## Run locally

Serve the repository root over HTTP (JSON data is loaded with `fetch`, so opening `index.html` as a `file://` URL will not load the data):

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Update the content

- **Projects:** edit `data/projects.json`. The existing entries are explicitly personal concepts / works in progress, not client claims. Each includes copy for a small case-study view. Set `image` to a relative image path to replace the CSS visual.
- **Photography:** replace the clearly marked scene placeholders by adding your own images under `assets/photography/` and setting `image` in `data/photography.json`. Optional metadata is intentionally blank until accurate details are known. The viewer, counter, captions, and touch swipe are already wired up.
- **Music:** a short, original synthesized demo loop is included so the player can be tested; it is labelled as a placeholder and is not attributed to Edi. Replace it with audio in `assets/music/` and update `data/playlist.json` using `title`, `artist`, and `src` (optional `cover`, `duration`). The player supports play/pause, previous/next, seeking, and never autoplays.
- **Experiments:** edit `data/experiments.json`; the lab list and random idea button read the same content.
- **Contact / social:** update the contact email and social URLs in `index.html` before publishing. `hello@edimahendra.com` and the platform home links are placeholders pending Edi's real contact details.
- **Last updated / timeline / status:** edit the corresponding small static lines in `index.html` as the portfolio changes.

Photography and project artwork shown before real media is added is labeled as a placeholder. No third-party imagery is presented as Edi's work. The external Google Fonts link has system-font fallbacks.

## Interaction notes

Responsive navigation; identity reveal; project filters and case-study dialogs; photo viewer with keyboard and touch navigation; music panel; AI-assisted workflow diary; random lab idea; command palette (`Ctrl/Cmd + K`); keyboard shortcut guide (`?`); scroll-aware header and section marker; custom cursor on fine pointers; reduced-motion support.
