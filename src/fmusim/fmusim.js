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
      this.controlDefs = controlDefs;
      this.M = M;
      this.bindFmi();
      this.setStatus(`Loaded ${this.meta.model || this.meta.model_identifier} (${this.meta.generation_tool || 'FMI 2.0'}).`);
      this.reset();
      this.ready = true;
    }).catch(e => {
      this.setStatus(`Could not start: ${e.message} — this component must be served over HTTP, not file://`, true);
      console.error('[dbs-fmusim]', e);
    });
  }

  detaching() {
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
    if (c.fallback && this.meta.parameters && c.key in this.meta.parameters) return this.meta.parameters[c.key];
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
      // A <input type=range> clamps an assigned value to [min,max] — silently, with no error.
      // controlDefs is data (default-controls.json, or a page's own controlsurl), authored
      // without knowing every record it will ever be pointed at; a record whose own value
      // falls outside the configured range would otherwise boot already "edited": cur would
      // diverge from base before any reader touched a slider, and isPristine() would never be
      // true, permanently withholding the reference verdict. Widening here guarantees the
      // record's own value is always exactly reachable, so "Reset to extracted values" means
      // what it says regardless of how the range was tuned.
      inp.min = Math.min(c.min, startDisplay);
      inp.max = Math.max(c.max, startDisplay);
      inp.step = c.step;
      inp.value = startDisplay;

      const show = () => {
        const shown = Number(inp.value);
        const v = c.mult ? this.base.parameters[c.key] * shown : shown / c.scale;
        if (c.sim) { this.cur.stop_time = v; } else { this.cur.parameters[c.key] = v; }
        out.textContent = this.fmtSI(c.mult ? v * c.scale : shown, c.unit)
          + (c.mult ? `  (${shown.toFixed(2)}\u00d7)` : '');
      };
      inp.addEventListener('input', show);
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

  simulate(p) {
    const M = this.M, fmi = this.fmi, meta = this.meta;
    const stop = p.stop_time || 86400;
    // Same rule as the FMPy driver (export/fmu.py): the dose is a rectangular pulse
    // adminDuration wide, so the communication step must resolve it.
    const adminDuration = p.parameters.adminDuration != null ? p.parameters.adminDuration : 600;
    const step = Math.min(30, Math.max(0.02, adminDuration / 50));

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
    const q = this.alloc(outs.map(o => meta.vr[o]), Uint32Array);
    const vp = M._malloc(outs.length * 8);
    freeLater.push(q, vp);
    const peak = {}, series = {};
    outs.forEach(o => { peak[o] = 0; series[o] = []; });
    const times = [];

    const t0 = performance.now();
    let t = 0, n = 0;
    // Plot at most ~1200 points; the solver still steps at `step`.
    const every = Math.max(1, Math.round((stop / step) / 1200));
    while (t < stop) {
      const h = Math.min(step, stop - t);
      if (fmi.doStep(inst, t, h, 1) !== 0) throw new Error(`fmi2DoStep failed at t=${t}`);
      t += h; n++;
      fmi.getReal(inst, q, outs.length, vp);
      const v = new Float64Array(M.HEAPU8.buffer, vp, outs.length);
      outs.forEach((o, i) => { if (v[i] > peak[o]) peak[o] = v[i]; });
      if (n % every === 0) {
        times.push(t);
        outs.forEach((o, i) => series[o].push(v[i]));
      }
    }
    fmi.free(inst);
    freeLater.forEach(ptr => M._free(ptr));
    return { peak, series, times, outs, steps: n, ms: performance.now() - t0, step, stop };
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

  renderRef(res) {
    const pristine = this.isPristine();
    this.refRows = res.outs.map(o => {
      const ref = this.base.reference_peaks ? this.base.reference_peaks[o] : null;
      const rel = (ref && pristine) ? Math.abs(res.peak[o] - ref) / ref : null;
      let verdict, cls = '';
      if (!ref) { verdict = 'no reference'; }
      else if (!pristine) { verdict = 'n/a — parameters edited'; }
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

  // Round tick step (1/2/5 x 10^n) so the axis reads 0.2, 0.4, 0.6 rather than 0.1819, 0.3638.
  niceStep(range, target) {
    const raw = range / target, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
  }

  fmtTick(v, step) {
    const dec = Math.max(0, -Math.floor(Math.log10(step)));
    return v.toFixed(Math.min(dec, 6));
  }

  plot(res) {
    const cv = this.plotCanvas, g = cv.getContext('2d');
    const W = cv.width, H = cv.height, L = 190, R = 40, T = 26, B = 104;
    g.clearRect(0, 0, W, H);
    const o = res.outs[0];
    const ys = res.series[o], xs = res.times;
    if (!ys || !ys.length) return;

    const xmaxSec = xs[xs.length - 1];
    const useDays = xmaxSec / 3600 > 48;
    const xf = useDays ? 1 / 86400 : 1 / 3600;
    const xUnit = useDays ? 'd' : 'h';
    const xmax = xmaxSec * xf;

    const cu = this.pickConcUnit(Math.max.apply(null, ys));
    const ymaxRaw = Math.max.apply(null, ys) * cu.factor;
    const ystep = this.niceStep(ymaxRaw || 1, 5);
    const ymax = Math.ceil((ymaxRaw || 1) / ystep) * ystep;
    const xstep = this.niceStep(xmax || 1, 6);

    const X = t => L + (W - L - R) * (t / xmax);
    const Y = v => H - B - (H - T - B) * (v / ymax);

    g.font = '22px sans-serif';
    g.fillStyle = '#6b7280';
    g.strokeStyle = '#e3e7eb';
    g.lineWidth = 2;

    for (let v = 0; v <= ymax + ystep * 1e-9; v += ystep) {
      const y = Y(v);
      g.beginPath(); g.moveTo(L, y); g.lineTo(W - R, y); g.stroke();
      g.textAlign = 'right'; g.textBaseline = 'middle';
      g.fillText(this.fmtTick(v, ystep), L - 14, y);
    }
    for (let t = 0; t <= xmax + xstep * 1e-9; t += xstep) {
      const x = X(t);
      g.textAlign = 'center'; g.textBaseline = 'top';
      g.fillText(this.fmtTick(t, xstep), x, H - B + 14);
    }

    g.fillStyle = '#374151';
    g.font = '600 24px sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'top';
    g.fillText(`time (${xUnit})`, L + (W - L - R) / 2, H - B + 54);
    g.save();
    g.translate(38, T + (H - T - B) / 2);
    g.rotate(-Math.PI / 2);
    g.textBaseline = 'top';
    g.fillText(`concentration (${cu.unit})`, 0, 0);
    g.restore();

    g.strokeStyle = '#0074d9'; g.lineWidth = 3; g.beginPath();
    xs.forEach((tt, i) => {
      const px = X(tt * xf), py = Y(ys[i] * cu.factor);
      i ? g.lineTo(px, py) : g.moveTo(px, py);
    });
    g.stroke();

    const peakDisp = res.peak[o] * cu.factor;
    this.plotNote = `Peak ${peakDisp.toPrecision(4)} ${cu.unit} (${o})  \u00b7  `
      + `${res.steps} solver steps (h = ${res.step} s) over ${(res.stop / 3600).toFixed(0)} h `
      + `in ${res.ms.toFixed(0)} ms.`;
  }

  // ── public actions (bound to the template's buttons) ───────────────────────────────────────
  // simulate() failures are fatal — there is nothing to show. plot() failures are not: they
  // are a rendering concern (e.g. no 2D canvas context available) and must not hide a correct
  // reference-check verdict, which is the whole point of this component.
  run() {
    let res;
    try {
      res = this.simulate(this.cur);
    } catch (e) {
      this.setStatus(`Simulation failed: ${e.message}`, true);
      console.error('[dbs-fmusim]', e);
      return;
    }
    this.renderRef(res);
    try {
      this.plot(res);
    } catch (e) {
      console.error('[dbs-fmusim] plot failed (reference check above is unaffected):', e);
    }
    this.setStatus(`Simulation finished: ${res.steps} steps in ${res.ms.toFixed(0)} ms.`);
  }

  reset() {
    this.cur = JSON.parse(JSON.stringify(this.base));
    this.buildControls();
    this.run();
  }
}
