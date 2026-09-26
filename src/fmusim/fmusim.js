import { bindable, customElement, resolve } from 'aurelia';
import defaultControls from './default-controls.json';

// dbs-fmusim — a one-shot FMU simulator: fetch a record's extracted parameters, run them
// against a compiled FMI 2.0 WebAssembly template, plot the result, and compare the browser's
// peak against the FMPy reference the engineer recorded when the record was built.
//
// This ports scripts/docs/check-wasm-fmu.mjs's FMI call sequence — instantiate →
// setupExperiment → setReal/setInteger → enter/exit init → doStep loop → getReal → free —
// verified against 451 extracted popPK records in the pharmacolibrary KB. Deliberately kept
// as one file with mostly-imperative DOM/canvas code: the physics and the unit conversions
// are the part worth trusting, and a thin Aurelia shell around proven code is lower risk than
// re-deriving it inside framework bindings.
//
// Each simulate() call instantiates its own FMU instance and frees it before returning, so
// unlike a persistent real-time engine there is no global instance registry to collide with
// a second <dbs-fmusim> on the same page — even one driving a different drug's copy of the
// SAME template.
@customElement('dbs-fmusim')
export class Fmusim {
  @bindable paramsurl = '';    // the record's extracted *_params.json
  @bindable metaurl = '';      // the template's compiled .vr.json (guid, vr map, tolerance, template defaults)
  @bindable wasmurl = '';      // the template's compiled Emscripten .js (defines window[meta.model_identifier])
  @bindable controlsurl = '';  // optional: JSON array of slider definitions (see default-controls.json for the shape)
  @bindable controls = '';     // optional: the same shape, inline as a JSON string; used when controlsurl is empty
  @bindable title = '';        // optional heading
  @bindable tolerance = 0.02;  // fractional tolerance for the OK/FAIL reference verdict

  element = resolve(Element);
  controlDefs = [];
  meta = null; base = null; cur = null;
  M = null; fmi = null; cb = null;
  refRows = [];
  statusText = 'Loading…';
  statusErr = false;
  plotNote = '';
  ready = false;
  // The FIRST run — the record's own extracted values — is kept so every later run is drawn
  // against it. Without it a reader moving a slider sees a new curve with nothing to compare
  // it to, which is the whole question a simulator on a record page answers: what does this
  // parameter do to the paper's own model?
  baseline = null;
  showBaseline = true;
  // y axis: 'auto' (log for a parent–metabolite plot whose peaks differ > 20x, else linear),
  // or the reader's choice from the scale button. logActive is what the last plot used.
  yScale = 'auto';
  logActive = false;
  // Mass (mg/L) or molar (µmol/L) concentration. Molar needs every drawn molecule's molar mass,
  // which the payload carries as molar_masses {observable: kg/mol} only when the record's
  // molecules have one (DrugBank / the paper / PubChem) — never a guess, so no toggle without.
  molar = Fmusim.loadMolar();
  molarAvailable = false;
  edited = false;
  // How eagerly a slider re-simulates. A 24 h run is a few ms and can follow the drag; a
  // record whose own horizon is three weeks (a weekly GLP-1 analogue) is several hundred ms,
  // and re-running it on every 'input' event makes the slider itself feel stuck. So the
  // reader picks: 'live' = every frame of the drag, 'release' = once the mouse is let go,
  // 'manual' = only when the button is pressed. The choice is remembered per browser.
  simMode = Fmusim.loadMode();
  pending = false;                 // an edit the current mode has not simulated yet

  // ── boot ────────────────────────────────────────────────────────────────────────────────
  // meta is fetched first, on its own: it carries model_identifier, the name the WASM
  // factory registers itself under, which loadWasm() needs. Everything meta does not gate
  // (the record's own params, the control definitions, the WASM module itself) then loads
  // in parallel.
  attached() {
    this.fetchJson(this.metaurl).then(meta => {
      this.meta = meta;
      return Promise.all([
        this.fetchJson(this.paramsurl),
        this.loadControls(),
        this.loadWasm(this.wasmurl, meta),
      ]);
    }).then(([base, controlDefs, M]) => {
      this.base = base;
      this.molarAvailable = this.hasMolar;
      this.controlDefs = controlDefs;
      this.M = M;
      this.bindFmi();
      this.setStatus(`${this.meta.model || this.meta.model_identifier} \u00b7 ${this.meta.generation_tool || 'FMI 2.0'}`);
      this.reset();
      this.observeResize();
      this.ready = true;
    }).catch(e => {
      this.setStatus(`Could not start: ${e.message} — this component must be served over HTTP, not file://`, true);
      console.error('[dbs-fmusim]', e);
    });
  }

  // The canvas takes its pixel size from its CSS box, so a window (or panel) resize has to
  // repaint — otherwise the last bitmap is stretched again, which is the artefact this all
  // replaced. Repaint from the LAST RESULT; never re-simulate on a resize.
  observeResize() {
    if (typeof ResizeObserver !== 'function' || this.ro) return;
    let w = 0;
    this.ro = new ResizeObserver(() => {
      const nw = this.plotCanvas ? this.plotCanvas.clientWidth : 0;
      if (!nw || nw === w) return;
      w = nw;
      if (this.lastRes) {
        try { this.plot(this.lastRes); } catch { /* a repaint failure must not break the page */ }
      }
    });
    this.ro.observe(this.plotCanvas);
  }

  detaching() {
    if (this.ro) { this.ro.disconnect(); this.ro = null; }
    // Free the indirect-function-table slot the FMI logger callback occupies. Everything
    // else (malloc'd FMU buffers) is freed inside simulate() itself, per call.
    if (this.M && this.loggerPtr != null) {
      this.M.removeFunction(this.loggerPtr);
      this.loggerPtr = null;
    }
  }

  fetchJson(url) {
    if (!url) return Promise.reject(new Error('missing URL'));
    return fetch(url).then(r => {
      if (!r.ok) throw new Error(`${url} → ${r.status}`);
      return r.json();
    });
  }

  loadControls() {
    if (this.controlsurl) return this.fetchJson(this.controlsurl);
    if (this.controls) {
      try { return Promise.resolve(JSON.parse(this.controls)); }
      catch (e) { return Promise.reject(new Error(`controls: ${e.message}`)); }
    }
    return Promise.resolve(defaultControls);
  }

  // Loads the Emscripten factory script once (dedup by src, matching dbs-fmi's getScript())
  // and calls it. The factory's global name is meta.model_identifier — the same string the
  // FMU export stamps into the .vr.json and the one the FMI instantiate() call below uses as
  // its instanceName, so no separate "which global do I load" bindable is needed.
  loadWasm(src, meta) {
    const name = meta.model_identifier;
    if (window[name]) return Promise.resolve(window[name]()).then(M => (this.M = M));
    const already = Array.from(document.getElementsByTagName('script'))
      .some(s => s.getAttribute('src') === src);
    return new Promise((resolve, reject) => {
      if (!already) {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onerror = () => reject(new Error(`could not load ${src}`));
        script.onload = () => (window[name] ? resolve(window[name]()) : reject(new Error(`${src} did not define window.${name}`)));
        document.head.appendChild(script);
      } else {
        // already tag-inserted by a prior instance on this page; poll briefly for the global
        const start = Date.now();
        const poll = () => {
          if (window[name]) return resolve(window[name]());
          if (Date.now() - start > 10000) return reject(new Error(`timed out waiting for window.${name}`));
          setTimeout(poll, 50);
        };
        poll();
      }
    });
  }

  setStatus(msg, isErr) {
    this.statusText = msg;
    this.statusErr = !!isErr;
  }

  // ── controls ────────────────────────────────────────────────────────────────────────────
  // Where a control's starting value comes from: the record, the template's own default
  // (fallback: true), or the record's stop_time (sim: true). null means "skip this control".
  startValue(c) {
    if (c.sim) return this.base.stop_time || 86400;
    if (c.key in this.base.parameters) return this.base.parameters[c.key];
    // `default_s` is the control's own starting value in SI, used when NEITHER the record
    // nor the template pins the parameter — a dosing interval on a weeks-long run, where the
    // template's 8 h is not a plausible schedule for the drug being simulated. It never
    // overrides a value that was actually extracted.
    if (c.fallback && this.meta.parameters && c.key in this.meta.parameters) {
      const tpl = this.meta.parameters[c.key];
      return (c.default_s != null && Number.isFinite(c.default_s)) ? c.default_s : tpl;
    }
    if (c.default_s != null && Number.isFinite(c.default_s)) return c.default_s;
    return null;
  }

  fmtSI(x, unit) {
    if (x === undefined || x === null) return '-';
    const a = Math.abs(x);
    const s = (a >= 1000 || (a < 0.01 && a > 0)) ? x.toExponential(3) : x.toFixed(a < 1 ? 3 : 2);
    return unit ? `${s} ${unit}` : s;
  }

  // A control not pinned by the record is running on the template's own value. Flagged
  // inline next to the number it qualifies (not the label): an assumption, not an error.
  isFallback(c) {
    return !c.sim && !(c.key in this.base.parameters);
  }

  fallbackHint(c) {
    if (c.default_s != null) {
      return `This record does not pin ${c.key}; the value is a schedule chosen for this `
        + `model's time scale, not an extracted one.`;
    }
    return `This record does not pin ${c.key}; the value is the template's own default.`;
  }

  buildControls() {
    const box = this.controlsBox;
    box.innerHTML = '';
    this.controlDefs.forEach(c => {
      const start = this.startValue(c);
      if (start === null) return;

      const wrap = document.createElement('div');
      const lab = document.createElement('label');
      const out = document.createElement('span');
      out.className = 'val';
      lab.innerHTML = `<b>${c.label}</b> `;
      lab.appendChild(out);

      if (this.isFallback(c)) {
        const hint = document.createElement('span');
        hint.className = 'hint';
        hint.textContent = 'simulator value';
        hint.title = this.fallbackHint(c);
        lab.appendChild(hint);
      }

      const inp = document.createElement('input');
      inp.type = 'range';
      // The slider lives in DISPLAY units (or in multiples, for mult controls); converting
      // the start value INTO them here is what makes a seconds-valued default like 28800 s
      // land at 8 h on the slider instead of clamping to the display-unit max.
      const startDisplay = c.mult ? 1 : start * c.scale;
      // A <input type=range> SANITISES an assigned value — silently, with no error — in two
      // ways, and both would make a record boot already "edited": cur would diverge from base
      // before any reader touched a slider, isPristine() would never be true, the reference
      // verdict would be withheld forever, AND the first simulation would run a value the
      // paper never reported. controlDefs is data, authored without knowing every record it
      // will be pointed at, so the range must adapt to the record, not the other way round:
      //
      //  1. It clamps to [min, max]. Widen the range to include the record's own value.
      //  2. It snaps onto the STEP GRID, which is anchored at `min`. A lag of 846 s is
      //     14.1 min; with step=1 the browser rounds it to 14 — a 6 s change to the model
      //     that shows up as a 0.6 % error against the FMPy reference on a page nobody has
      //     edited. So `min` is lowered by whatever fraction of a step puts the record's
      //     value exactly on the grid: start = min + n·step for integer n.
      const step = Number(c.step) > 0 ? Number(c.step) : 1;
      const lo = Math.min(c.min, startDisplay);
      const n = Math.ceil((startDisplay - lo) / step - 1e-9);
      inp.min = startDisplay - n * step;
      inp.max = Math.max(c.max, startDisplay);
      inp.step = step;
      inp.value = startDisplay;

      const show = () => {
        const shown = Number(inp.value);
        const v = c.mult ? this.base.parameters[c.key] * shown : shown / c.scale;
        if (c.sim) { this.cur.stop_time = v; } else { this.cur.parameters[c.key] = v; }
        out.textContent = this.fmtSI(c.mult ? v * c.scale : shown, c.unit)
          + (c.mult ? `  (${shown.toFixed(2)}\u00d7)` : '');
      };
      // A slider that needs a button pressed afterwards is a slider whose effect nobody
      // sees. 'input' fires continuously while dragging: update the readout every time, and
      // re-simulate at most once per animation frame so a drag stays smooth (a run is a few
      // hundred solver steps — cheap, but not free at 60 Hz). 'change' fires once when the
      // drag ends, which is the authoritative run.
      // The readout ALWAYS tracks the slider, in every mode — it is the value the reader is
      // choosing, not a simulation result. Only the run is deferred.
      inp.addEventListener('input', () => {
        show();
        if (this.simMode === 'live') this.scheduleRun();
        else this.pending = true;
      });
      inp.addEventListener('change', () => {
        show();
        if (this.simMode === 'manual') this.pending = true;
        else this.run();
      });
      show();
      wrap.appendChild(lab); wrap.appendChild(inp);
      box.appendChild(wrap);
    });
  }

  // ── the FMI 2.0 call sequence, identical to scripts/docs/check-wasm-fmu.mjs ────────────────
  bindFmi() {
    const cw = (n, r, a) => this.M.cwrap(n, r, a);
    this.fmi = {
      createCb: cw('createFmi2CallbackFunctions', 'number', ['number']),
      instantiate: cw('fmi2Instantiate', 'number', ['string', 'number', 'string', 'string', 'number', 'number', 'number']),
      setup: cw('fmi2SetupExperiment', 'number', ['number', 'number', 'number', 'number', 'number', 'number']),
      enterInit: cw('fmi2EnterInitializationMode', 'number', ['number']),
      exitInit: cw('fmi2ExitInitializationMode', 'number', ['number']),
      setReal: cw('fmi2SetReal', 'number', ['number', 'number', 'number', 'number']),
      setInteger: cw('fmi2SetInteger', 'number', ['number', 'number', 'number', 'number']),
      getReal: cw('fmi2GetReal', 'number', ['number', 'number', 'number', 'number']),
      doStep: cw('fmi2DoStep', 'number', ['number', 'number', 'number', 'number']),
      free: cw('fmi2FreeInstance', 'number', ['number']),
    };
    const logger = this.M.addFunction((env, name, st, cat, msg) => {
      if (st >= 2) console.error('[fmu]', this.M.UTF8ToString(msg));
    }, 'viiiiii');
    this.loggerPtr = logger;
    this.cb = this.fmi.createCb(logger);
  }

  alloc(arr, Type) {
    const p = this.M._malloc(arr.length * Type.BYTES_PER_ELEMENT);
    new Type(this.M.HEAPU8.buffer, p, arr.length).set(arr);
    return p;
  }

  // The step must resolve the dose pulse (adminDuration/50) AND put every dose edge on the
  // grid: the first dose starts at adminTime (+ Tlag on an enteral template, whose lag shifts
  // the schedule), and clopidogrel's Tlag = 705.6 s landed between 12 s steps — every peak
  // read 2 % high. Search adminDuration/n (n = 50, 100, …) for a step that divides the first
  // dose time and the period as well; fall back to adminDuration/50. Same rule as
  // scripts/docs/check-wasm-fmu.mjs in pharmacolibrary-dev.
  pickStep(p) {
    const tp = (this.meta && this.meta.parameters) || {};
    const pick = (k, d) => (p[k] != null ? p[k] : (tp[k] != null ? tp[k] : d));
    const dur = pick('adminDuration', 600);
    const first = pick('adminTime', 60) + pick('Tlag', 0);
    const period = pick('adminPeriod', 0);
    const count = pick('adminCount', 1);
    const onGrid = (x, h) => Math.abs(x / h - Math.round(x / h)) < 1e-6;
    for (let n = 50; n <= 5000; n += 50) {
      const h = dur / n;
      if (h < 0.02) break;
      if (onGrid(first, h) && (count === 1 || !period || onGrid(period, h))) return Math.min(30, h);
    }
    return Math.min(30, Math.max(0.02, dur / 50));
  }

  simulate(p) {
    const M = this.M, fmi = this.fmi, meta = this.meta;
    const stop = p.stop_time || 86400;
    // A SWEEP payload (x_axis set — the PD exposure-response templates) has no dose pulse:
    // simulated time IS the swept exposure, so the step only has to draw the curve. A PK
    // payload keeps the FMPy driver's rule (export/fmu.py): the dose is a rectangular pulse
    // adminDuration wide, so the communication step must resolve it.
    const sweep = p.x_axis && p.x_axis.variable ? p.x_axis.variable : null;
    const step = sweep ? stop / 1000 : this.pickStep(p.parameters);

    const inst = fmi.instantiate(meta.model_identifier, 1, meta.guid, 'file:///', this.cb, 0, 0);
    if (!inst) throw new Error('fmi2Instantiate failed');
    fmi.setup(inst, 1, meta.tolerance, 0, 1, stop);

    const INT_NAMES = { adminCount: true };  // Integer in the template; the file stores a float
    const reals = [], ints = [];
    const freeLater = [];
    Object.keys(p.parameters).forEach(k => {
      if (!(k in meta.vr)) return;
      (INT_NAMES[k] ? ints : reals).push([k, p.parameters[k]]);
    });
    if (reals.length) {
      const qr = this.alloc(reals.map(e => meta.vr[e[0]]), Uint32Array);
      const vr = this.alloc(reals.map(e => e[1]), Float64Array);
      freeLater.push(qr, vr);
      if (fmi.setReal(inst, qr, reals.length, vr) !== 0) throw new Error('fmi2SetReal failed');
    }
    if (ints.length) {
      const qi = this.alloc(ints.map(e => meta.vr[e[0]]), Uint32Array);
      const vi = this.alloc(ints.map(e => Math.round(e[1])), Int32Array);
      freeLater.push(qi, vi);
      if (fmi.setInteger(inst, qi, ints.length, vi) !== 0) throw new Error('fmi2SetInteger failed');
    }

    fmi.enterInit(inst); fmi.exitInit(inst);

    const outs = p.observables.filter(o => o in meta.vr);
    // The swept variable is read beside the observables so the plot can use it as x, but it
    // is not an observable: no peak, no reference row.
    const qvars = (sweep && sweep in meta.vr && outs.indexOf(sweep) < 0) ? outs.concat([sweep]) : outs;
    const q = this.alloc(qvars.map(o => meta.vr[o]), Uint32Array);
    const vp = M._malloc(qvars.length * 8);
    freeLater.push(q, vp);
    const peak = {}, series = {};
    qvars.forEach(o => { peak[o] = 0; series[o] = []; });
    const times = [];

    const t0 = performance.now();
    let t = 0, n = 0;
    // Plot at most ~1200 points; the solver still steps at `step`.
    const every = Math.max(1, Math.round((stop / step) / 1200));
    // The state at t = 0 is a sample too: for a sweep it is the exposure-0 point (the
    // baseline the first reference row checks), and a curve that starts at its first STEP
    // hides where it came from.
    fmi.getReal(inst, q, qvars.length, vp);
    {
      const v0 = new Float64Array(M.HEAPU8.buffer, vp, qvars.length);
      times.push(0);
      qvars.forEach((o, i) => { series[o].push(v0[i]); if (v0[i] > peak[o]) peak[o] = v0[i]; });
    }
    while (t < stop) {
      const h = Math.min(step, stop - t);
      if (fmi.doStep(inst, t, h, 1) !== 0) throw new Error(`fmi2DoStep failed at t=${t}`);
      // Time as n*step, not t += h: summed, 57,000 steps of 0.02 s land at 1139.99999999925 s,
      // just before a dose edge at 1140 s, and the dose pulse is then held one step too long
      // (+2 % at adminDuration/50). FMPy — which produced reference_peaks — computes n*step.
      n++; t = Math.min(n * step, stop);
      fmi.getReal(inst, q, qvars.length, vp);
      const v = new Float64Array(M.HEAPU8.buffer, vp, qvars.length);
      qvars.forEach((o, i) => { if (v[i] > peak[o]) peak[o] = v[i]; });
      if (n % every === 0) {
        times.push(t);
        qvars.forEach((o, i) => series[o].push(v[i]));
      }
    }
    fmi.free(inst);
    freeLater.forEach(ptr => M._free(ptr));
    const xs = sweep && series[sweep] ? series[sweep] : times;
    return { peak, series, times, xs, sweep, outs, steps: n, ms: performance.now() - t0, step, stop };
  }

  // ── reference check ────────────────────────────────────────────────────────────────────────
  // The recorded peak was produced by FMPy at the EXTRACTED values. Once a slider moves, a
  // difference from that peak is the edit talking, not a fault, so the verdict is withheld
  // rather than turned red — compared against each control's start value (the template
  // default for a fallback control, which is what FMPy also ran with), not raw key equality.
  isPristine() {
    return this.controlDefs.every(c => {
      const start = this.startValue(c);
      if (start === null) return true;
      const now = c.sim ? this.cur.stop_time : this.cur.parameters[c.key];
      return Math.abs(now - start) <= Math.abs(start) * 1e-12;
    });
  }

  // For a sweep the reference is not a peak but POINTS: reference_points maps a swept
  // exposure (SI) to the response the record's own closed form gives there (exposure 0 →
  // baseline, EC50 → half the effect term …). The browser's curve is read at the nearest
  // sample and compared the same way a peak is.
  renderRefPoints(res) {
    const pristine = this.isPristine();
    const o = res.outs[0], ys = res.series[o], xs = res.xs;
    const xa = this.base.x_axis || {}, ya = this.base.y_axis || {};
    const xf = xa.factor ? 1 / xa.factor : 1, yf = ya.factor ? 1 / ya.factor : 1;
    this.refRows = Object.keys(this.base.reference_points).map(k => {
      const x = Number(k), ref = Number(this.base.reference_points[k]);
      let bi = 0;
      xs.forEach((xx, i) => { if (Math.abs(xx - x) < Math.abs(xs[bi] - x)) bi = i; });
      const got = ys[bi];
      const scale = Math.max(Math.abs(ref), 1e-12);
      const rel = pristine ? Math.abs(got - ref) / scale : null;
      let verdict, cls = '';
      if (!pristine) { verdict = 'n/a — parameters edited'; }
      else { verdict = rel <= this.tolerance ? 'OK' : 'FAIL'; cls = rel <= this.tolerance ? 'ok' : 'fail'; }
      const at = `${o} @ ${(x * xf).toPrecision(3)} ${xa.display_unit || ''}`.trim();
      return {
        o: at, cls, verdict,
        peak: (got * yf).toPrecision(4) + (ya.display_unit ? ` ${ya.display_unit}` : ''),
        ref: (ref * yf).toPrecision(4) + (ya.display_unit ? ` ${ya.display_unit}` : ''),
        diff: rel != null ? `${(100 * rel).toFixed(2)} %` : '-',
      };
    });
  }

  renderRef(res) {
    if (res.sweep && this.base.reference_points) return this.renderRefPoints(res);
    const pristine = this.isPristine();
    this.refRows = res.outs.map(o => {
      const ref = this.base.reference_peaks ? this.base.reference_peaks[o] : null;
      // A peak can only be compared by a run that reaches it. Semaglutide peaks at 3.4 DAYS:
      // a 24 h run reports the rising limb (1.63e-3 against a recorded 5.86e-3) and calling
      // that FAIL blames the model for the horizon. Withhold the verdict instead.
      const tPeak = (this.base.reference_peak_times || {})[o];
      const tooShort = Number.isFinite(tPeak) && res.stop < tPeak;
      const rel = (ref && pristine && !tooShort) ? Math.abs(res.peak[o] - ref) / ref : null;
      let verdict, cls = '';
      if (!ref) { verdict = 'no reference'; }
      else if (!pristine) { verdict = 'n/a — parameters edited'; }
      else if (tooShort) { verdict = 'n/a — run ends before the reference peak'; }
      else { verdict = rel <= this.tolerance ? 'OK' : 'FAIL'; cls = rel <= this.tolerance ? 'ok' : 'fail'; }
      return {
        o, cls, verdict,
        peak: res.peak[o].toExponential(4),
        ref: ref != null ? ref.toExponential(4) : '-',
        diff: rel != null ? `${(100 * rel).toFixed(2)} %` : '-',
      };
    });
  }

  // ── plot ────────────────────────────────────────────────────────────────────────────────────
  // The model works in SI (kg, m^3), so concentration comes out in kg/m^3 — numerically g/L,
  // which for these doses means ticks like 9.1e-4. The axis is rescaled to mg/L, or to µg/L
  // when the curve is too dilute for mg/L to have digits.
  pickConcUnit(peakModel) {
    const mg = peakModel * 1e3;
    return (mg >= 0.1) ? { unit: 'mg/L', factor: 1e3 } : { unit: '\u00b5g/L', factor: 1e6 };
  }

  // The same for a molar curve: mol/m^3 is mmol/L; shown in µmol/L, or nmol/L when dilute.
  pickMolarUnit(peakMolar) {
    const um = peakMolar * 1e3;
    return (um >= 0.1) ? { unit: '\u00b5mol/L', factor: 1e3 } : { unit: 'nmol/L', factor: 1e6 };
  }

  // Every observable of this record has a molar mass (and it is a time course, not a sweep).
  get hasMolar() {
    const mm = (this.base && this.base.molar_masses) || {};
    const obs = (this.base && this.base.observables) || [];
    return !(this.base && this.base.x_axis) && obs.length > 0 && obs.every(k => mm[k] > 0);
  }

  // Round tick step (1/2/5 x 10^n) so the axis reads 0.2, 0.4, 0.6 rather than 0.1819, 0.3638.
  niceStep(range, target) {
    const raw = range / target, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
  }

  fmtTick(v, step) {
    const dec = Math.max(0, -Math.floor(Math.log10(step)));
    return v.toFixed(Math.min(dec, 6));
  }

  // The current run in the theme blue, the first run (the record's own values) behind it in
  // a light blue, on the SAME axes — the axes are sized to cover both, so a parameter that
  // halves the peak visibly halves it instead of rescaling the picture.
  // Size the backing store to the element's CSS box times the device pixel ratio, then draw
  // in CSS pixels. The canvas used to be a fixed 1800x680 bitmap stretched to width:100%, so
  // every label was a RESIZED BITMAP: 22px type rendered at whatever scale the window
  // happened to impose, fuzzy on one screen and huge on another. Now the type is 11-12px and
  // stays 11-12px, and the curve is crisp on a HiDPI display.
  sizeCanvas() {
    const cv = this.plotCanvas;
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    const W = Math.max(320, Math.round(cv.clientWidth || cv.parentElement?.clientWidth || 900));
    const H = Math.max(220, Math.min(420, Math.round(W * 0.42)));
    cv.style.height = `${H}px`;
    const bw = Math.round(W * dpr), bh = Math.round(H * dpr);
    if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; }
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { g, W, H };
  }

  plot(res) {
    this.lastRes = res;
    const cv = this.plotCanvas;
    const { g, W, H } = this.sizeCanvas();
    const L = 58, R = 16, T = 14, B = 42;
    g.clearRect(0, 0, W, H);
    const o = res.outs[0];
    const ys = res.series[o], xs = res.xs || res.times;
    if (!ys || !ys.length) return;
    // kg/m^3 → mol/m^3: each molecule divided by its own molar mass
    const mm = (this.base && this.base.molar_masses) || {};
    const molar = !res.sweep && this.molar && this.hasMolar;
    const div = k => (molar ? 1 / mm[k] : 1);
    // the first run, when it is a different run and the reader has not hidden it
    const bl = (this.showBaseline && this.baseline && this.baseline !== res
                && this.baseline.series && this.baseline.series[o]
                && this.baseline.series[o].length) ? this.baseline : null;
    const bys = bl ? bl.series[o] : null;
    const bxs = bl ? (bl.xs || bl.times) : null;

    // Axes. A PK run is concentration over time (h or d, mg/L or µg/L picked from the peak).
    // A sweep is response over exposure, both in the record's own display units: the payload
    // carries x_axis / y_axis {display_unit, factor} with factor = SI per display unit.
    const xa = res.sweep ? (this.base.x_axis || {}) : null;
    const ya = res.sweep ? (this.base.y_axis || {}) : null;
    const xmaxRaw = Math.max(xs[xs.length - 1], bxs ? bxs[bxs.length - 1] : 0);
    const useDays = !xa && xmaxRaw / 3600 > 48;
    const xf = xa ? (xa.factor ? 1 / xa.factor : 1) : (useDays ? 1 / 86400 : 1 / 3600);
    const xUnit = xa ? (xa.display_unit || '') : (useDays ? 'd' : 'h');
    const xLabel = xa ? `${xa.variable || 'exposure'}${xUnit ? ` (${xUnit})` : ''}` : `time (${xUnit})`;
    const xmax = xmaxRaw * xf;

    // A parent–metabolite model (PK_3M_*) observes several molecules. Each gets a line; when
    // their peaks differ by more than 20x (clopidogrel's carboxylic acid is ~800x the parent)
    // a linear axis would flatten all but one, so the axis goes logarithmic.
    const multi = !xa && res.outs.length > 1;
    const outPeaks = res.outs.map(k => Math.max.apply(null, res.series[k] || [0]) * div(k));
    const allMax = Math.max.apply(null, outPeaks);
    const posPeaks = outPeaks.filter(v => v > 0);
    const autoLog = multi && posPeaks.length > 1 && allMax / Math.min.apply(null, posPeaks) > 20;
    const logY = !xa && (this.yScale === 'log' || (this.yScale === 'auto' && autoLog));
    this.logActive = logY;
    const cu = ya ? { unit: ya.display_unit || '', factor: ya.factor ? 1 / ya.factor : 1 }
                  : (molar ? this.pickMolarUnit : this.pickConcUnit)(
                      multi ? allMax : Math.max.apply(null, ys) * div(o));
    const yLabel = ya ? `${o}${cu.unit ? ` (${cu.unit})` : ''}`
                      : `${molar ? 'molar ' : ''}concentration (${cu.unit})`;
    const ymaxRaw = Math.max(multi ? allMax : Math.max.apply(null, ys) * div(o),
                             bys ? Math.max.apply(null, bys) * div(o) : -Infinity) * cu.factor;
    // A sweep can go NEGATIVE (an inhibition from a baseline of 0: 0 → −0.076); the axis
    // starts at the curve's minimum then, not at 0.
    const yminRaw = Math.min(0, Math.min.apply(null, ys) * cu.factor,
                             bys ? Math.min.apply(null, bys) * cu.factor : 0);
    const ystep = this.niceStep((ymaxRaw - yminRaw) || 1, 5);
    const ymax = Math.ceil((ymaxRaw || (yminRaw ? 0 : 1)) / ystep) * ystep;
    const ymin = Math.floor(yminRaw / ystep) * ystep;
    const xstep = this.niceStep(xmax || 1, 6);

    const X = t => L + (W - L - R) * (t / xmax);
    // Log axis, whole decades: from the decade BELOW the trough to the decade ABOVE the peak —
    // Cmax 1e2 and Ctrough 1e-3 give 1e-4 … 1e3. The trough is the lowest END-of-run value
    // over the drawn curves (a concentration of 0, like the first sample, has no logarithm),
    // floored at Cmax·1e-6 so a curve that decays to numerical dust does not drag the axis
    // down twenty decades.
    let dTop = 0, dLow = 0;
    if (logY) {
      const drawn = (multi ? res.outs : [o]).map(k => [res.series[k] || [], div(k)])
        .concat(bys ? [[bys, div(o)]] : []);
      const vmax = ymaxRaw > 0 ? ymaxRaw : 1;
      const ends = drawn.map(([sy, d]) => (sy.length ? sy[sy.length - 1] * d * cu.factor : 0))
        .filter(v => v > 0);
      const trough = Math.max(ends.length ? Math.min.apply(null, ends) : vmax * 1e-3, vmax * 1e-6);
      dTop = Math.floor(Math.log10(vmax)) + 1;
      dLow = Math.min(Math.floor(Math.log10(trough)) - 1, dTop - 1);
    }
    const Y = logY
      ? v => { const lv = Math.log10(Math.max(v, Math.pow(10, dLow)));
               return H - B - (H - T - B) * ((lv - dLow) / (dTop - dLow || 1)); }
      : v => H - B - (H - T - B) * ((v - ymin) / (ymax - ymin || 1));

    g.font = '10px system-ui, sans-serif';
    g.fillStyle = '#6b7280';
    g.strokeStyle = '#e3e7eb';
    g.lineWidth = 1;

    if (logY) {
      for (let d = dLow; d <= dTop; d++) {
        const v = Math.pow(10, d), y = Y(v);
        g.beginPath(); g.moveTo(L, y); g.lineTo(W - R, y); g.stroke();
        g.textAlign = 'right'; g.textBaseline = 'middle';
        g.fillText(v >= 0.01 && v < 1e4 ? String(+v.toPrecision(1)) : v.toExponential(0), L - 6, y);
      }
    } else for (let v = ymin; v <= ymax + ystep * 1e-9; v += ystep) {
      const y = Y(v);
      g.beginPath(); g.moveTo(L, y); g.lineTo(W - R, y); g.stroke();
      g.textAlign = 'right'; g.textBaseline = 'middle';
      g.fillText(this.fmtTick(v, ystep), L - 6, y);
    }
    for (let t = 0; t <= xmax + xstep * 1e-9; t += xstep) {
      const x = X(t);
      g.textAlign = 'center'; g.textBaseline = 'top';
      g.fillText(this.fmtTick(t, xstep), x, H - B + 6);
    }

    g.fillStyle = '#374151';
    g.font = '600 11px system-ui, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'top';
    g.fillText(xLabel, L + (W - L - R) / 2, H - B + 22);
    g.save();
    g.translate(13, T + (H - T - B) / 2);
    g.rotate(-Math.PI / 2);
    g.textBaseline = 'top';
    g.fillText(logY ? `${yLabel}, log scale` : yLabel, 0, 0);
    g.restore();

    if (bl) {
      g.strokeStyle = '#9ec9f0'; g.lineWidth = 3; g.beginPath();
      bxs.forEach((tt, i) => {
        const px = X(tt * xf), py = Y(bys[i] * div(o) * cu.factor);
        i ? g.lineTo(px, py) : g.moveTo(px, py);
      });
      g.stroke();
    }
    const PALETTE = ['#0074d9', '#d95f02', '#1b9e77'];
    (multi ? res.outs : [o]).forEach((k, j) => {
      const sy = res.series[k];
      if (!sy || !sy.length) return;
      g.strokeStyle = PALETTE[j % PALETTE.length]; g.lineWidth = 1.75; g.beginPath();
      xs.forEach((tt, i) => {
        const px = X(tt * xf), py = Y(sy[i] * div(k) * cu.factor);
        i ? g.lineTo(px, py) : g.moveTo(px, py);
      });
      g.stroke();
    });
    if (multi) {
      // legend: which molecule each colour is (the record's own names when the payload has them)
      const labels = this.base.observable_labels || {};
      const lx = L + 10, ly = T + 4;
      g.font = '10px system-ui, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
      res.outs.forEach((k, j) => {
        g.lineWidth = 2; g.strokeStyle = PALETTE[j % PALETTE.length];
        g.beginPath(); g.moveTo(lx, ly + 5 + 16 * j); g.lineTo(lx + 22, ly + 5 + 16 * j); g.stroke();
        g.fillStyle = '#374151';
        g.fillText(labels[k] ? `${labels[k]} (${k})` : k, lx + 28, ly + 5 + 16 * j);
      });
    }
    if (bl) {
      // legend, top-right of the plot area
      const lx = W - R - 168, ly = T + 4;
      g.lineWidth = 3; g.strokeStyle = '#9ec9f0';
      g.beginPath(); g.moveTo(lx, ly + 5); g.lineTo(lx + 22, ly + 5); g.stroke();
      g.lineWidth = 1.75; g.strokeStyle = '#0074d9';
      g.beginPath(); g.moveTo(lx, ly + 21); g.lineTo(lx + 22, ly + 21); g.stroke();
      g.fillStyle = '#6b7280'; g.font = '10px system-ui, sans-serif';
      g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillText('extracted values (first run)', lx + 28, ly + 5);
      g.fillText('current parameters', lx + 28, ly + 21);
    }

    if (xa) {
      const last = ys[ys.length - 1] * cu.factor;
      this.plotNote = `${o} ${last.toPrecision(4)} ${cu.unit} at ${xmax.toPrecision(3)} ${xUnit}`
        + `  \u00b7  ${res.steps} points  \u00b7  ${res.ms.toFixed(0)} ms`;
      return;
    }
    const peakDisp = res.peak[o] * div(o) * cu.factor;
    this.plotNote = `Peak ${peakDisp.toPrecision(4)} ${cu.unit} (${o})  \u00b7  `
      + `${res.steps} steps \u00d7 ${res.step} s  \u00b7  ${res.ms.toFixed(0)} ms`;
  }

  // ── public actions (bound to the template's buttons) ───────────────────────────────────────
  // simulate() failures are fatal — there is nothing to show. plot() failures are not: they
  // are a rendering concern (e.g. no 2D canvas context available) and must not hide a correct
  // reference-check verdict, which is the whole point of this component.
  // A drag fires 'input' dozens of times a second. Coalesce those into one run per frame so
  // the curve follows the slider without queueing simulations the reader will never see; the
  // 'change' at the end of the drag runs unthrottled and has the last word.
  scheduleRun() {
    if (this.runQueued) return;
    this.runQueued = true;
    const go = () => { this.runQueued = false; this.run(); };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(go);
    else setTimeout(go, 16);
  }

  run() {
    this.pending = false;
    let res;
    try {
      res = this.simulate(this.cur);
    } catch (e) {
      this.setStatus(`Simulation failed: ${e.message}`, true);
      console.error('[dbs-fmusim]', e);
      return;
    }
    // The first run of the record's own values IS the baseline every later run is drawn
    // against. isPristine() decides it, so a reset re-establishes it and an edited run never
    // overwrites it.
    if (this.isPristine()) this.baseline = res;
    this.edited = !this.isPristine();
    this.renderRef(res);
    try {
      this.plot(res);
    } catch (e) {
      console.error('[dbs-fmusim] plot failed (reference check above is unaffected):', e);
    }
    this.setStatus(`${res.steps} steps in ${res.ms.toFixed(0)} ms`);
  }

  // localStorage is per-origin and may throw (private mode, blocked site data), so every
  // access is guarded and an unreadable store simply means the default.
  static loadMolar() {
    try { return localStorage.getItem('dbs-fmusim.molar') === '1'; } catch (e) { return false; }
  }

  static loadMode() {
    try {
      const m = localStorage.getItem('dbs-fmusim.simMode');
      return m === 'release' || m === 'manual' ? m : 'live';
    } catch (e) { return 'live'; }
  }

  setSimMode(mode) {
    this.simMode = mode;
    try { localStorage.setItem('dbs-fmusim.simMode', mode); } catch (e) { /* not stored */ }
    // Switching to a less manual mode settles whatever the reader already moved, so the
    // curve on screen always matches the sliders under it.
    if (mode !== 'manual' && this.pending) this.run();
  }

  toggleMolar() {
    this.molar = !this.molar;
    try { localStorage.setItem('dbs-fmusim.molar', this.molar ? '1' : '0'); } catch (e) { /* not stored */ }
    if (this.lastRes) this.plot(this.lastRes);      // a redraw — the simulation is unchanged
  }

  toggleScale() {
    this.yScale = this.logActive ? 'lin' : 'log';
    if (this.lastRes) this.plot(this.lastRes);      // a redraw — the simulation is unchanged
  }

  toggleBaseline() {
    this.showBaseline = !this.showBaseline;
    this.run();
  }

  reset() {
    this.cur = JSON.parse(JSON.stringify(this.base));
    this.baseline = null;            // the next run is pristine and becomes the new baseline
    this.buildControls();
    this.run();
  }
}
