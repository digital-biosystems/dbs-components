# documentation root

This documentation site is built with [docsify](https://docsify.js.org/). It serves the
Markdown files in this folder directly in the browser — there is no build step and no
generated output to commit.

## Run locally

Any static file server works because docsify renders the Markdown client-side. From the
`docs/` directory pick one:

```bash
# using docsify-cli (recommended, adds live-reload)
npm i -g docsify-cli
docsify serve .            # http://localhost:3000

# or any static server
npx serve .                # http://localhost:3000
python3 -m http.server     # http://localhost:8000
```

## Structure

* `index.html` — docsify entry point and configuration. It also loads
  `assets/js/dbs-full-bundle.js` so every `<dbs-*>` custom element works in the docs.
* `index.md` — site homepage.
* `_sidebar.md` — navigation.
* `<component>/index.md` — one page per component (with live demos).
* `.nojekyll` — tells GitHub Pages to serve the files as-is (no Jekyll processing).

The component bundle is refreshed by `npm run build` in the repo root, which copies
`dist/dbs-full-bundle.js` into `docs/assets/js/`.
