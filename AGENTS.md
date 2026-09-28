# AGENTS.md

## Commands

- `npm start` — dev server at `http://localhost:9000` (entry `dev-app/main.js`, `HtmlWebpackPlugin` on `index.html`).
- `npm run build` — production build → `dist/` (`webpack --env production` via `webpack.config.cjs`). Also runs `cp dist/* test_integration/` and `cp dist/dbs-full-bundle.js dist/dbs-shared.js dist/dbs-fmusim.js docs/assets/js/` — don't expect all of `dist/` in `docs/`.
- `npm run build:myapp` — standalone demo → `dist-myapp/` (`webpack --env myapp`, entry `dev-app/main-myapp.js`, hashed filenames).
- `npm test` — runs `pretest` (`npm run lint`) then Jest. Lint failure blocks tests — use `npx jest <path>` or `npm run test:watch` to skip lint.
- `npx jest test/hello-world.spec.js` — single file (matches `<rootDir>/test/**/*.spec.js`). Coverage collected from `src/**/*.js`.
- `npm run lint` / `npm run lint:js` / `npm run lint:css` — ESLint (`eslint.config.mjs`, ignores `src/**/_legacy/**`) and Stylelint (`stylelint-config-standard` on `src/**/*.css`).
- `npm run analyze` — production build with `webpack-bundle-analyzer`.

## Architecture

- Aurelia 2 web-components library. Each component in `src/<name>/` has `index.js` (registration), `<name>.js` (`@customElement` + `@bindable`), `<name>.html` (Aurelia template), `<name>.css` (Shadow DOM-scoped). Canonical example: `src/helloworld/`.
- Registration is via `src/register.js:7` `createRegistry()` — `DI.createContainer()` + `BrowserPlatform` + `StandardConfiguration` + `StyleConfiguration.shadowDOM({})` → `WcCustomElementRegistry.define('dbs-<name>', Class)`. Every `src/*/index.js` follows this; `src/chartjs/index.js:1` registers 8 elements (e.g. `dbs-fmi`, `dbs-chartjs3`) from one bundle.
- Build entries in `webpack.config.cjs:33` — production `entry` map, not `src/index.js`. `src/index.js` is only used by `dev-app/main.js:7` (`Aurelia.register(Plugin).app(MyApp)`). File is `.cjs` (not `.js`).
- `webpack.config.cjs` trap: `dbs-fmi` entry is `./src/chartjs/index.js`, not `./src/fmi/`. `src/fmi/` (`fmi.js`, `FmiSimulationController.js`, `FmiBuffer*.js`) is the simulation engine bundled *into* `dbs-fmi`.
- Self-contained bundles: `dbs-bundle` and `dbs-full-bundle` are excluded from `splitChunks` (`webpack.config.cjs:96`). Per-component builds share code via `dbs-shared.js` (`minChunks:2`); those require loading `dbs-shared.js` *before* the component script. `dbs-bundle`/`dbs-full-bundle` are standalone.
- Dev vs prod `resolve.alias`: dev injects Aurelia `esm/index.dev.mjs` aliases via `getAureliaDevAliases()` (`webpack.config.cjs:310`); prod has no aliases. CSS rules differ by `issuer` (`src/main.js` vs Shadow DOM vs `.html`).

## Adding a Component

Follow `src/helloworld/` and `README.md` checklist: `src/<name>/index.js` + view-model/html/css → export in `src/index.js` → add to `dev-app/my-app.html` for manual testing → add entry in `webpack.config.cjs` production `entry` and optionally to `dbs-bundle`/`dbs-full-bundle` arrays → add `docs/<name>/index.md`.

## Framework Quirks

- Babel: `babel.config.json:14` `@babel/plugin-proposal-decorators` version `2023-11` required for `@customElement`/`@bindable`. Changing version breaks decorators.
- Jest: `package.json:77` — `jsdom` env, `@aurelia/babel-jest` with `defaultShadowOptions:{mode:"open"}` for both `js` and `html`. Static assets stubbed via `jest-transform-stub`. `test/setup.js:4` bootstraps `BrowserPlatform`/`setPlatform` and tears down fixtures `afterEach` via `onFixtureCreated`/`fixture.stop(true)`.
- Inter-component events: `IEventAggregator` channels `fmidata:{id}`, `fmireset:{id}`, `fmistart:{id}`/`fmistop:{id}` (`CLAUDE.md` documents payload). Consumers use `fromid`/`targetid` bindables, subscribe in `attached()`, dispose in `detaching()`.
- Custom attributes: e.g. `src/chartjs/convertors-attribute.js` — `@customAttribute`+`@bindable` injecting `IController` to reach host viewModel.
- Shared styles: `src/w3.css` imported via `<require from="../w3.css">` in templates; component CSS is Shadow DOM-scoped via `StyleConfiguration.shadowDOM`.
- Env: `Dotenv` loads `.env` in production and `.env.development` otherwise (`webpack.config.cjs:227`). Both files exist but are empty — required for build, not runtime config.
- `type: "module"` (`package.json:6`); `prepare` script auto-runs `npm run build` on `npm publish`/`npm pack`.

## Verification & Publishing

- Verify after edits: `npm run lint` before `npm test` locally; `npm run build` must succeed (Terser `compress:false` for main build, `true` for myapp).
- Publishing: `sync_release_docs.sh` checks out `release`, restores `dist`+`docs` from `master`, commits and pushes to `origin` and `github` remotes. Used for GitHub Pages (`digital-biosystems.github.io/dbs-components`).

## References

- Existing detailed guide: `CLAUDE.md` (architecture, event channels, tech stack).
