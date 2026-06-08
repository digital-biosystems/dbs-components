# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **Aurelia 2 web components library** (`dbs-components`) that produces standalone, self-contained custom HTML elements distributed as JavaScript bundles. Components use Shadow DOM for style encapsulation and work in any HTML page without requiring a full Aurelia application.

## Commands

```bash
npm start                          # Dev server at http://localhost:9000
npm run build                      # Production build → dist/, also copies to test_integration/ and docs/assets/js/
npm run build:myapp                # Build the standalone demo app → dist-myapp/
npm test                           # Run Jest unit tests (also runs lint first via pretest)
npm run test:watch                 # Run tests in watch mode (skips lint)
npx jest test/hello-world.spec.js  # Run a single test file
npm run lint                       # Run both JS (ESLint) and CSS (Stylelint) linting
npm run lint:js                    # ESLint on src/ and test/
npm run lint:css                   # Stylelint on src/**/*.css
npm run analyze                    # Build with webpack-bundle-analyzer visualization
```

## Architecture

### Component Structure

Each component lives in `src/<name>/` and follows this pattern:
- `index.js` — Bootstraps an Aurelia DI container and registers the component as a native custom element
- `<name>.js` — Aurelia `@customElement` view model with `@bindable` properties
- `<name>.html` — Aurelia template (binding syntax: `${expr}`, `repeat.for`, `if.bind`, etc.)
- `<name>.css` — Shadow DOM-scoped styles

The `index.js` for every component is nearly identical — it creates an Aurelia DI container, registers `BrowserPlatform` + `StandardConfiguration` + `StyleConfiguration.shadowDOM`, then calls `registry.define('dbs-<name>', ComponentClass)`.

### Build System

`webpack.config.js` has two modes:
- **Development**: single entry at `dev-app/main.js`, uses Aurelia dev aliases pointing to `.dev.mjs` builds
- **Production**: multiple entries — one per component (e.g. `dbs-chartjs`, `dbs-pgxbadge`) plus `dbs-bundle` (a curated multi-component bundle). Shared code across individual components is extracted into `dbs-shared.js` via `splitChunks`, but `dbs-bundle` is intentionally excluded from splitting (self-contained).

### Adding a New Component

1. Create `src/<name>/` with `index.js`, `<name>.js`, `<name>.html`, `<name>.css`
2. Use `src/helloworld/` as the canonical reference implementation
3. Register in `src/index.js`
4. Add to `dev-app/my-app.html` for testing
5. Add entry to `webpack.config.js` production entries (and optionally to `dbs-bundle` array)
6. Add documentation page in `docs/<name>/index.md`

### Inter-Component Communication

Components that display or react to simulation data communicate via Aurelia's `IEventAggregator` using namespaced event channels scoped to a component `id` attribute:

- `fmidata:{id}` — published with `{ time, data[] }` payload when simulation values update
- `fmireset:{id}` — published to clear displayed values
- `fmistart:{id}` / `fmistop:{id}` — control simulation lifecycle

Consumer components (e.g. `dbs-value`, `dbs-chartjs`) subscribe using `fromid` / `targetid` bindable props. Subscriptions are created in `attached()` and disposed in `detaching()`.

### Custom Attributes

Beyond `@customElement`, some components expose Aurelia custom attributes (e.g. `dbs-convertors` in `src/chartjs/convertors-attribute.js`). These use `@customAttribute` + `@bindable` and inject `IController` to reach the host viewModel directly.

### Shared Styles

`src/w3.css` is the W3.CSS utility library imported into templates with `<require from="../w3.css">`. Most component templates use W3.CSS classes for layout and color. Component-specific styles go in their own `<name>.css` file (Shadow DOM-scoped).

### Webpack Entry Naming

The `dbs-fmi` production entry points to `src/chartjs/index.js` (not `src/fmi/`). The `src/fmi/` directory contains the FMI simulation engine (`fmi.js`, `FmiSimulationController.js`) and is bundled as part of `dbs-fmi`.

### Publishing

After building, run `sync_release_docs.sh` to push `dist/` and `docs/` changes to the `release` branch of the external `github.com/digital-biosystems/dbs-components` repo, which triggers GitHub Pages rendering.

## Key Technologies

- **Aurelia 2** (`@aurelia/web-components`, `@aurelia/runtime-html`, `@aurelia/kernel`) — component framework
- **Babel** with `@babel/plugin-proposal-decorators` (2023-11 version) — required for `@customElement`, `@bindable` decorators
- **Chart.js 4** + plugins (`chartjs-chart-geo`, `chartjs-plugin-annotation`, `chartjs-adapter-date-fns`) — used by chart components
- **marked** — markdown rendering in several components
- **@mlc-ai/web-llm** — in-browser LLM for `webllmchat` component

## Testing

Tests live in `test/**/*.spec.js` and use Jest with `jsdom` + `@aurelia/babel-jest` transformer. Shadow DOM mode is `open` to allow test introspection. The `pretest` hook runs lint before tests.
