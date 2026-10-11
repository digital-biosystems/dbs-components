# `<dbs-fmusim>` Web Component

The `<dbs-fmusim>` web component runs a **one-shot** FMI 2.0 simulation of a compiled
WebAssembly template using one record's extracted parameters, plots the result, and checks
the browser's peak against the FMPy reference recorded when the record was built. Unlike
`<dbs-fmi>` (continuous, real-time, animation-driven), it instantiates the FMU, runs it to a
stop time, frees it, and returns — there is no persistent engine or global instance registry,
so two `<dbs-fmusim>` elements on the same page never collide, even when they load the same
template.

?> version: 0.1<br/>The component is in development. Some features may not work or may change.

## Demo

```html
<dbs-fmusim
  title="Tolvaptan — Lanke 2019"
  paramsurl="knowledgebase/drugs/drug_tolvaptan/models/fmu_params/Tolvaptan_Lanke2019_reference_params.json"
  metaurl="assets/fmu/PK_1C.vr.json"
  wasmurl="assets/fmu/PK_1C.js">
</dbs-fmusim>
```
<dbs-fmusim
  title="Tolvaptan — Lanke 2019"
  paramsurl="assets/fmu/Tolvaptan_Lanke2019_reference_params.json"
  metaurl="assets/fmu/PK_1C.vr.json"
  wasmurl="assets/fmu/PK_1C.js">
</dbs-fmusim>

## Usage

1. Include the component in your HTML file. `dbs-fmusim.js` is a per-component build, not
   a self-contained bundle like `dbs-bundle.js`/`dbs-full-bundle.js`: webpack's `splitChunks`
   pulled the Aurelia/lodash/chart.js code every small component shares out into
   `dbs-shared.js`, so **`dbs-shared.js` must be loaded first**. Loading `dbs-fmusim.js` alone
   is not an error you will see — the element simply never upgrades (no shadow root, nothing
   in `customElements.get('dbs-fmusim')`), because its entry module sits behind an unsatisfied
   chunk dependency that never arrives. If a page already loads `dbs-bundle.js` or
   `dbs-full-bundle.js`, that bundle is self-contained and `dbs-shared.js` is not needed
   *for it* — but `dbs-fmusim.js` still needs its own copy alongside it, since it was not
   built into that bundle (see "Why a separate script", above).

```html
<script src="path/to/dbs-shared.js"></script>
<script src="path/to/dbs-fmusim.js"></script>
```

2. Point it at the three artefacts an FMU export already produces — nothing needs to be
   authored by hand:

```html
<dbs-fmusim paramsurl="..._params.json" metaurl="TEMPLATE.vr.json" wasmurl="TEMPLATE.js"></dbs-fmusim>
```

- `paramsurl` — the record's extracted parameters (`pk_knowledge_scripts.export.fmu`'s
  `*_params.json`): `model_id`, `template`, `parameters`, `observables`, `reference_peaks`,
  `stop_time`.
- `metaurl` — the compiled template's `.vr.json`: `guid`, `model_identifier`, the value-reference
  map, `tolerance`, and the template's own parameter defaults.
- `wasmurl` — the compiled template's Emscripten `.js`. Its factory function is a global
  variable named `model_identifier` (the same string `metaurl` reports and the same string
  used as the FMI `instanceName`), so the component derives the name to load itself — no
  separate "which global" attribute is needed. Loading the same `wasmurl` twice on one page
  is a no-op past the first load.

## Editable parameters

Sliders are driven by a JSON array of control definitions — configurable per page, not
hardcoded:

```html
<dbs-fmusim controlsurl="my-controls.json" ...></dbs-fmusim>
<!-- or inline: -->
<dbs-fmusim controls='[{"key":"adminMass","label":"Dose","unit":"mg","scale":1e6,"min":0.1,"max":4,"step":0.05,"mult":true}]' ...></dbs-fmusim>
```

When neither is given, the component falls back to its own `default-controls.json` — dose,
clearance, Vd/kg, body weight, bioavailability, dose count, dosage period, and simulated time,
the set validated against the pharmacolibrary popPK templates.

Each control object:

| key | meaning |
|---|---|
| `key` | the FMU parameter name (or `stop_time`, see `sim` below) |
| `label` | slider label |
| `unit` | display unit shown next to the value |
| `scale` | multiplies the model (SI) value to get the displayed value |
| `min` / `max` / `step` | slider range, in **display units** (or in multiples, see `mult`) |
| `mult` | *(optional)* the slider is a multiplier of the record's own value — `1.00×` is exactly what the record says — rather than an absolute display-unit range |
| `sim` | *(optional)* this control sets the simulated stop time, not an FMU parameter |
| `fallback` | *(optional)* show this control even when the record does not pin `key`, seeded from the **template's** own default (flagged inline as "simulator value", not asserted as the paper's finding) |

A control whose `key` is absent from the record **and** not marked `fallback` is silently
skipped — that is how the demo's Tolvaptan record, which does not pin `adminDuration`, still
sends the template's own value to the FMU without offering a slider for it (the export uses a
fixed duration to encode an oral dose vs. an infusion; dragging it would invent a regimen the
paper never described).

## Reference check

The panel compares the browser's peak against `reference_peaks` from `paramsurl`, at a
tolerance set by the `tolerance` attribute (default `0.02`, i.e. 2%, matching
`scripts/docs/check-wasm-fmu.mjs --tol`). Once any slider has moved away from the record's own
values, the verdict reads `n/a — parameters edited` rather than a false `FAIL`: the comparison
is only meaningful at the point that produced `reference_peaks`.

## Attributes

| Attribute | Description | Type | Default |
|---|---|---|---|
| `paramsurl` | URL to the record's extracted `*_params.json` | String | |
| `metaurl` | URL to the template's `.vr.json` | String | |
| `wasmurl` | URL to the template's compiled Emscripten `.js` | String | |
| `controlsurl` | URL to a JSON array of control definitions | String | |
| `controls` | the same shape, as an inline JSON string (used when `controlsurl` is empty) | String | |
| `title` | optional heading shown above the panel | String | |
| `tolerance` | fractional tolerance for the OK/FAIL reference verdict | Number | `0.02` |

## Why not `<dbs-fmi>`

`<dbs-fmi>` is built for continuous, real-time, animated simulation — a single global
`window.fmiinst[fminame]` instance stepped on `requestAnimationFrame`, controlled through
`IEventAggregator` channels (`fmiinput`, `fmistart:{id}`, `fmidata:{id}`, …). That is the right
shape for a live model driven by knobs while it runs. This component's job is different: run
once to a stop time, plot the trace, and check it against a stored reference — an
already-verified batch computation (`scripts/docs/check-wasm-fmu.mjs`), not a live loop. Reusing
`<dbs-fmi>`'s engine would mean re-deriving that computation inside its animation-frame
stepping and event plumbing, and re-validating it against the FMPy reference from scratch.
Keeping the two separate means each stays correct for the execution model it was actually
built and checked against.
