# `<dbs-pksites>` Web Component

The `<dbs-pksites>` web component renders the ADME **Sites & Interactions** view — a site heat-map, anatomogram and shared-actor tables for any set of drugs, computed entirely in the browser. It is a port of the `pharmacolibrary-docs` `/sites` page (`assets/js/pk-sites.js` + `sites.md#pk-sites`) into a standalone Aurelia 2 custom element, with no docsify dependency.

The SQLite database and the anatomogram SVG are **not bundled**. They are linked during deployment via the `db` (and optionally `anatomogram` / `sql-wasm`) attributes and are fetched lazily when the element is attached — the same discipline the docs site uses, so no page pays for a 6.5 MB database it never opens.

## Demo

```html
<dbs-pksites
  db="data/adme-ee9360f546.sqlite"
  drugs="tolvaptan,telmisartan,hydrochlorothiazide">
</dbs-pksites>
```

<dbs-pksites db="data/adme-ee9360f546.sqlite" drugs="tolvaptan,telmisartan,hydrochlorothiazide"></dbs-pksites>

> The demo above uses the same artefacts as the pharmacolibrary docs site. Point `db` at the SQLite file you deploy alongside it (see *Deployment* below).

## What it renders

* **Search + chips** — type-ahead over `adme_drug`/`adme_synonym` (generic name or synonym), up to `max` (default 8) drugs. Chips wear the set's categorical colour (also used in the heat-map and the anatomogram slots). Click a chip to isolate that drug, click again to clear, × to remove.
* **Site heat-map** — `PROC × TISSUE` matrix (`absorption/distribution/metabolism/excretion` × 20 hand-curated tissues). Cell colour encodes the strongest evidence at that process·tissue: `drugbank_actor` (3) > `paper_pgx` (2) > `drugbank_text` (1). An amber ring marks a cell **affected** by co-administration; dots inside are the perpetrator's colour — filled = inhibits, hollow = induces.
* **Who affects whom** — directed `perpetrator → victim` matrix over the shared `inhibitor/inducer → substrate` pairs (`affected`). Empty rows/columns are readable: this drug affects nothing / is affected by nothing.
* **Anatomogram** — the EMBL-EBI Expression Atlas female body (CC BY 4.0, `assets/img/anatomogram-hs-female.svg` pruned to the 18 organs in the hand table). Each organ is a `<g>/<path>` whose `id` is its UBERON id, so the drawing is driven by id. Organs are tinted by the set's strongest evidence there (the kidney and the blood use their own red ramp) and outlined in the perpetrator's colour where another drug can act on it. Slots beside each organ are one per drug, ringed when affected; hover shows the actors, click pins the detail box.
* **Shared actors** — undirected list of every gene two drugs share, with both roles; `substrate` + `inhibitor/inducer` is flagged as a **DDI candidate**.
* **Table view** — every `rows` entry (`drug·process·tissue·actor·role·evidence`), with paper links and DOIs where available. Evidence tiers are documented on the page itself.

Logic is `pk_knowledge_scripts.adme_sites` (tissue matrix / shared actors / affected tissues) ported to `src/pksites/adme-compute.js`.

## Usage

### Standalone bundle

`dbs-pksites` is a per-component build (like `dbs-fmusim`). Its shared Aurelia/lodash code was split into `dbs-shared.js`, so `dbs-shared.js` must be loaded first — loading `dbs-pksites.js` alone silently does nothing (the entry sits behind an unsatisfied chunk dependency).

```html
<script src="path/to/dbs-shared.js"></script>
<script src="path/to/dbs-pksites.js"></script>

<dbs-pksites
  db="data/adme-ee9360f546.sqlite"
  anatomogram="assets/img/anatomogram-hs-female.svg"
  drugs="cilazapril,allopurinol"
  max="8">
</dbs-pksites>
```

If the page already loads `dbs-bundle.js`/`dbs-full-bundle.js`, those are self-contained and do not need `dbs-shared.js` for themselves — but `dbs-pksites.js` still needs its own copy alongside, because it was not built into that bundle.

### CDN / multi-bundle note

The same caveat as `dbs-fmusim` applies: `dbs-shared.js` + `dbs-pksites.js` must be loaded in that order, and `dbs-shared.js` must not be loaded in parallel with the component. The docs site lazy-loads `dbs-fmusim` by chaining `shared.onload → comp`:

```js
shared.onload = () => { const c = document.createElement('script'); c.src = 'assets/js/dbs-pksites.js'; document.body.appendChild(c); };
```

## Deployment — where the database lives

The component intentionally does **not** bundle the 6.5 MB ADME database or the 600 KB `sql.js` WASM. Both are linked at deploy time and fetched on demand (the same reason the pharmacolibrary `/sites` and `/query` routes keep their databases out of the main bundle).

Required at runtime:

| artefact | what it holds | typical path |
|---|---|---|
| `adme-*.sqlite` | the `adme_drug / adme_synonym / adme_actor / adme_site / adme_text` export (`pk_knowledge_scripts.export.adme_sqlite`, see `sites.md:49`) | `data/adme-ee9360f546.sqlite` |
| `adme-latest.json` | *optional* content-hashed pointer `{file, bytes, drugs, ...}` — use instead of a versioned filename when `db` points at this JSON, the component follows `file` | `data/adme-latest.json` |
| `sql-wasm.{js,wasm}` | the sql.js engine (688 KB total) — either the two files from `assets/sqljs/` or a CDN copy | `assets/sqljs/sql-wasm.js` + `sql-wasm.wasm` |
| `anatomogram-hs-female.svg` | the pruned EBI atlas drawing (bundled fallback at `src/pksites/anatomogram.svg` is used when `anatomogram` is omitted) | `assets/img/anatomogram-hs-female.svg` |

Minimal deployment:

```bash
# from the pharmacolibrary build output
cp pharmacolibrary-docs/data/adme-*.sqlite  docs/data/
cp pharmacolibrary-docs/data/adme-latest.json docs/data/  # if using the JSON pointer
cp -r pharmacolibrary-docs/assets/sqljs     docs/assets/sqljs/
cp pharmacolibrary-docs/assets/img/anatomogram-hs-female.svg docs/assets/img/
```

Then point the element at the served location:

```html
<!-- direct SQLite file -->
<dbs-pksites db="data/adme-ee9360f546.sqlite"></dbs-pksites>

<!-- or indirect via the JSON pointer (new releases are new URLs, Cache API friendly) -->
<dbs-pksites db="data/adme-latest.json"></dbs-pksites>

<!-- custom engine / drawing locations -->
<dbs-pksites
  db="data/adme-ee9360f546.sqlite"
  sql-wasm="assets/sqljs/sql-wasm.js"
  anatomogram="assets/img/anatomogram-hs-female.svg">
</dbs-pksites>
```

If `db` is omitted the component renders an explanatory placeholder and fetches nothing. Nothing is fetched until the element is **attached** — multiple `<dbs-pksites>` on one page share a single `fetch` per unique `db` URL (static `Map` cache), and `sql.js` is loaded at most once per page.

## Attributes

| Attribute | Description | Type | Default |
|---|---|---|---|
| `db` | URL to the ADME SQLite file **or** to `adme-latest.json` (see above). Linked during deployment, loaded lazily on attach. | String | `` (placeholder) |
| `anatomogram` | URL to the anatomogram SVG. When omitted, the pruned SVG bundled with the component (`src/pksites/anatomogram.svg`) is used. | String | bundled `anatomogram.svg` |
| `sql-wasm` | URL to the sql.js loader script (`sql-wasm.js`; the sibling `sql-wasm.wasm` is derived via `locateFile`). When omitted, tries `assets/sqljs/sql-wasm.js` then `https://sql.js.org/dist/sql-wasm.js`. | String | `assets/sqljs/sql-wasm.js` → CDN fallback |
| `drugs` | comma-separated slugs or generic names to pre-select (e.g. `drugs="tolvaptan,telmisartan"`). Resolved via `adme_synonym`. The chips keep truth — this is only the initial set. | String | `` |
| `max` | maximum number of drugs in the comparison | Number | `8` |
| `show-ddi` | show the co-administration layer (amber rings, dots, *Who affects whom* matrix) | Boolean | `true` |
| `include-text` | include prose-only sites (`drugbank_text` evidence tier 1) | Boolean | `true` |
| `focus` | slug of the isolated drug (set by clicking a chip; `null` = no isolation) | String | `null` |

## Events

| Event | Detail | When |
|---|---|---|
| `change` | `{drugs: string[], focus: string|null}` | chips / focus / remove change |
| `dbs-pksites-change` | same | alias, same as `change` |

Both bubble and are `composed: true` so they cross the Shadow DOM boundary.

```js
el.addEventListener('dbs-pksites-change', e => {
  history.replaceState(null, '', '#/sites?drugs=' + e.detail.drugs.join(','));
});
```

## Styling

The component uses Shadow DOM. Its stylesheet (`src/pksites/pksites.css`) is scoped to the element and carries the `--pks-ev* / --pks-kid*` vars, the heat-map ramp, the anatomogram organ styles and the tooltip. To adapt it, override inside the shadow via CSS custom properties (e.g. `--pks-ev3`) or fork `pksites.css` — external page CSS does not pierce the shadow.

The EBI atlas drawing itself is coloured imperatively per organ (inline `style.fill`): strongest evidence there, plus a dashed perpetrator-colour stroke where co-administration matters. See `src/pksites/constants.js:ORGANS` for the `UBERON_*` → organ mapping and `BODY_X/Y/SCALE` geometry.

## Relationship to the pharmacolibrary docs site

* `pharmacolibrary-docs/assets/js/pk-sites.js` exposed `window.pkSites` (`search/resolve/compute/render`) and was driven imperatively from `index.html`'s docsify plugin. `<dbs-pksites>` keeps those three tiers as the pure module `src/pksites/adme-compute.js` and moves the six imperative `render*` paths into the element's own viewModel (`src/pksites/pksites.js`).
* The `data/adme-*.sqlite` schema (`adme_drug`, `adme_synonym`, `adme_actor`, `adme_site`, `adme_text`) is unchanged — the component is a new **presentation** for the same database build, so pharmacolibrary releases that publish a new `adme-latest.json` + SQLite are immediately usable without a component release.

