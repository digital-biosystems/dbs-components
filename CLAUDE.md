# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Purpose

This is a **distribution and documentation repository** for DBS Web Components — reusable, framework-agnostic custom HTML elements (with `dbs-` prefix) for visualizing scientific data. The actual component source code lives in a separate repository. This repo contains:

- `dist/` — Pre-built, minified JavaScript bundles (compiled output, not source)
- `docs/` — Jekyll-based documentation site (deployed to GitHub Pages)

## Branches

- `main` — Documentation and configuration only (no dist/)
- `release` — Contains both `dist/` bundles and `docs/`; changes here trigger GitHub Pages deployment
- `gh-pages` — Auto-generated from CI; do not edit manually

## Documentation Site

The docs are a Jekyll site using the "just-the-docs" theme.

```bash
# Install Ruby gems (run once from docs/)
cd docs && bundle install

# Serve locally with live reload
cd docs && bundle exec jekyll serve

# Build for production
cd docs && bundle exec jekyll build
# Output lands in docs/_site/
```

The site is automatically deployed to GitHub Pages when changes to `docs/**` are pushed to the `release` branch via `.github/workflows/jekyll-gh-pages.yml`.

## Components

| Bundle file | Custom element(s) |
|---|---|
| `dbs-helloworld.js` | `<dbs-hello-world>` |
| `dbs-chartjs.js` | Chart.js 4.x wrappers (bar, line, pie, scatter, etc.) |
| `dbs-chartjsgeo.js` | Geographic/choropleth charts |
| `dbs-table.js` | `<dbs-table>` data table |
| `dbs-pgxchart.js` / `dbs-pgxbadge.js` | Pharmacogenomics chart & badge |
| `dbs-kbsearch.js` | `<dbs-kbsearch>` knowledge-base search |
| `dbs-fmi.js` | FMI/FMU simulation runner (browser-based) |
| `dbs-webllmchat.js` | `<dbs-webllmchat>` local LLM inference via WebLLM |
| `dbs-shared.js` | Shared dependencies (load before individual bundles) |
| `dbs-bundle.js` | All components in one file |

## Component Inter-communication

Components communicate via a publish/subscribe event channel. For example, `dbs-kbsearch` emits `kbsearch:query` and receives `kbsearch:result`. Some components also expose a global `window.Dbs<ComponentName>` object.

## Using Components (CDN)

```html
<script src="https://cdn.jsdelivr.net/gh/digital-biosystems/dbs-components@release/dist/dbs-bundle.js"></script>
<dbs-hello-world message="Hello!"></dbs-hello-world>
```

Or with individual bundles (shared must load first):

```html
<script src="dbs-shared.js"></script>
<script src="dbs-[component].js"></script>
```
