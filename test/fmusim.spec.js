import { Fmusim } from '../src/fmusim/fmusim.js';
import { createFixture } from '@aurelia/testing';
import { CustomElement } from 'aurelia';

// A minimal stand-in for the Emscripten module a real FMU template exports. It implements
// just enough of the FMI 2.0 surface fmusim.js calls (see bindFmi()/simulate()) to drive the
// component's OWN logic — fetch orchestration, control derivation, and the reference-peak
// verdict — deterministically and fast. The FMI call SEQUENCE itself, and the real PK_1C
// build, are already verified against the FMPy reference by scripts/docs/check-wasm-fmu.mjs
// and the manual browser check; re-loading that 1.7 MB build through Jest's babel transform
// here would be slow and would test the WASM build, not this component.
function makeFakeModule(peakValue) {
  const heap = new Uint8Array(1 << 16); // scratch space for every alloc() in the test file
  let brk = 8;
  const M = {
    HEAPU8: heap,
    _malloc: n => { const p = brk; brk += n + ((8 - (n % 8)) % 8); return p; },
    _free: () => {},
    addFunction: () => 1,
    removeFunction: () => {},
    UTF8ToString: () => '',
    cwrap: name => {
      switch (name) {
        case 'createFmi2CallbackFunctions': return () => 1;
        case 'fmi2Instantiate': return () => 1;
        case 'fmi2SetupExperiment':
        case 'fmi2EnterInitializationMode':
        case 'fmi2ExitInitializationMode':
        case 'fmi2SetReal':
        case 'fmi2SetInteger':
        case 'fmi2DoStep':
        case 'fmi2FreeInstance':
          return () => 0;
        case 'fmi2GetReal':
          return (inst, qPtr, count, outPtr) => {
            new Float64Array(M.HEAPU8.buffer, outPtr, count).fill(peakValue);
            return 0;
          };
        default:
          throw new Error(`unexpected cwrap('${name}')`);
      }
    },
  };
  return M;
}

const META = {
  model: 'FakeModel',
  generation_tool: 'jest fake',
  model_identifier: 'FakeFactoryFmusimTest',
  guid: '{fake}',
  tolerance: 1e-6,
  vr: { adminMass: 0, Cl: 1, VdPerKg: 2, weight: 3, F: 4, adminCount: 5, adminPeriod: 6, 'central.C': 7 },
  // adminPeriod is deliberately absent from the record's own params below, so the
  // `fallback: true` control has to source it from here — same shape as a real template.
  parameters: { adminPeriod: 28800 },
};

const BASE_PARAMS = {
  template: 'FAKE',
  parameters: { adminMass: 1e-4, Cl: 1e-6, VdPerKg: 1e-3, weight: 70, F: 1, adminCount: 1, adminDuration: 600 },
  observables: ['central.C'],
  reference_peaks: { 'central.C': 0.5 },
  stop_time: 3600,
};

const CONTROLS = [
  { key: 'adminMass', label: 'Dose', unit: 'mg', scale: 1e6, min: 0.1, max: 4, step: 0.05, mult: true },
  { key: 'Cl', label: 'Clearance', unit: 'L/h', scale: 3.6e6, min: 0.2, max: 3, step: 0.05, mult: true },
  { key: 'adminPeriod', label: 'Dosage period', unit: 'h', scale: 1 / 3600, min: 1, max: 48, step: 0.5, fallback: true },
  { key: 'stop_time', label: 'Simulated time', unit: 'h', scale: 1 / 3600, min: 8, max: 120, step: 1, sim: true },
  { key: 'notPinnedAnywhere', label: 'Should not render', unit: '', scale: 1, min: 0, max: 1, step: 1 },
];

function mockFetch(files) {
  return jest.fn(url => {
    if (!(url in files)) return Promise.resolve({ ok: false, status: 404 });
    return Promise.resolve({ ok: true, json: () => Promise.resolve(files[url]) });
  });
}

async function waitUntil(fn, timeoutMs = 2000) {
  const start = Date.now();
  while (!fn()) {
    if (Date.now() - start > timeoutMs) throw new Error('waitUntil() timed out');
    await new Promise(r => setTimeout(r, 5));
  }
}

async function mountFmusim(referencePeak) {
  window.FakeFactoryFmusimTest = () => makeFakeModule(0.5); // fake FMU always reports 0.5
  global.fetch = mockFetch({
    'meta.json': META,
    'params.json': { ...BASE_PARAMS, reference_peaks: { 'central.C': referencePeak } },
    'controls.json': CONTROLS,
  });

  const { appHost } = await createFixture(
    '<dbs-fmusim paramsurl="params.json" metaurl="meta.json" wasmurl="wasm.js" controlsurl="controls.json"></dbs-fmusim>',
    class {},
    [Fmusim],
  ).started;

  const el = appHost.querySelector('dbs-fmusim');
  const vm = CustomElement.for(el).viewModel;
  await waitUntil(() => vm.ready);
  return { appHost, el, vm };
}

describe('dbs-fmusim', () => {
  afterEach(() => {
    delete window.FakeFactoryFmusimTest;
  });

  it('reports OK when the browser peak matches the recorded reference', async () => {
    const { vm } = await mountFmusim(0.5);
    expect(vm.refRows).toHaveLength(1);
    expect(vm.refRows[0].o).toBe('central.C');
    expect(vm.refRows[0].verdict).toBe('OK');
    expect(vm.refRows[0].cls).toBe('ok');
  });

  it('reports FAIL when the recorded reference disagrees with the simulation', async () => {
    const { vm } = await mountFmusim(1.0); // fake FMU still reports 0.5 -> 100% off
    expect(vm.refRows[0].verdict).toBe('FAIL');
    expect(vm.refRows[0].cls).toBe('fail');
  });

  it('withholds the verdict once a parameter has been edited', async () => {
    const { vm } = await mountFmusim(0.5);
    expect(vm.refRows[0].verdict).toBe('OK');

    vm.cur.parameters.Cl *= 2; // simulate what a slider's `show()` callback does
    vm.run();

    expect(vm.refRows[0].verdict).toBe('n/a — parameters edited');
    expect(vm.refRows[0].cls).toBe('');
  });

  it('"Reset to extracted values" restores the pristine, matching verdict', async () => {
    const { vm } = await mountFmusim(0.5);
    vm.cur.parameters.Cl *= 3;
    vm.run();
    expect(vm.refRows[0].verdict).not.toBe('OK');

    vm.reset();
    expect(vm.refRows[0].verdict).toBe('OK');
  });

  it('builds one slider per control the record or the template can seed, and skips the rest', async () => {
    const { vm } = await mountFmusim(0.5);
    // adminMass, Cl (record), adminPeriod (template fallback), stop_time (sim) = 4 rendered;
    // notPinnedAnywhere is in neither base.parameters nor meta.parameters -> skipped.
    expect(vm.controlsBox.children).toHaveLength(4);
  });

  it('flags a fallback control as running on the simulator value, not the record', async () => {
    const { vm } = await mountFmusim(0.5);
    const hint = vm.controlsBox.querySelector('.hint');
    expect(hint).not.toBeNull();
    expect(hint.textContent).toBe('simulator value');
    expect(hint.title).toMatch(/adminPeriod/);
  });

  it('falls back to the bundled default-controls.json when no controls are given', async () => {
    window.FakeFactoryFmusimTest = () => makeFakeModule(0.5);
    global.fetch = mockFetch({
      'meta.json': META,
      'params.json': BASE_PARAMS,
    });
    const { appHost } = await createFixture(
      '<dbs-fmusim paramsurl="params.json" metaurl="meta.json" wasmurl="wasm.js"></dbs-fmusim>',
      class {},
      [Fmusim],
    ).started;
    const el = appHost.querySelector('dbs-fmusim');
    const vm = CustomElement.for(el).viewModel;
    await waitUntil(() => vm.ready);
    // default-controls.json's 8 entries; every key it names is either in BASE_PARAMS.parameters
    // or is stop_time/a fallback covered by META.parameters, so all 8 render.
    expect(vm.controlsBox.children.length).toBeGreaterThan(0);
  });

  it('boots pristine (OK) even when the record\'s own value falls outside the control range', async () => {
    // stop_time's configured range floor is 8h/28800s (see CONTROLS above), but this record
    // was exported with a 1h/3600s stop_time — below it. A plain <input type=range> silently
    // clamps an assigned value to its min, so without widening the range to include the
    // record's own value, `cur.stop_time` would boot at 28800 while `base.stop_time` stays
    // 3600: already "edited" before a reader touches anything, and the reference verdict would
    // never show OK for this record. This is a regression test for that widening.
    window.FakeFactoryFmusimTest = () => makeFakeModule(0.5);
    global.fetch = mockFetch({
      'meta.json': META,
      'params.json': { ...BASE_PARAMS, stop_time: 3600 },
      'controls.json': CONTROLS,
    });
    const { appHost } = await createFixture(
      '<dbs-fmusim paramsurl="params.json" metaurl="meta.json" wasmurl="wasm.js" controlsurl="controls.json"></dbs-fmusim>',
      class {},
      [Fmusim],
    ).started;
    const el = appHost.querySelector('dbs-fmusim');
    const vm = CustomElement.for(el).viewModel;
    await waitUntil(() => vm.ready);

    expect(vm.cur.stop_time).toBe(3600);
    expect(vm.refRows[0].verdict).toBe('OK');
  });

  it('anchors each slider\'s step grid on the record\'s own value, so the browser cannot snap it', async () => {
    // A range input rounds an assigned value onto its step grid (anchored at `min`). jsdom
    // does not implement that sanitisation, so this cannot reproduce the SYMPTOM — a real
    // browser turning a 14.1 min lag into 14 min and booting the page "edited". It asserts the
    // MECHANISM instead: for every rendered slider, (value - min) must be an integer number of
    // steps, which is exactly the condition under which a browser leaves the value alone.
    // The symptom itself is covered by the live-Chromium check in the pharmacolibrary docs
    // build (Allopurinol_Wen2023_final, Tlag = 846 s).
    window.FakeFactoryFmusimTest = () => makeFakeModule(0.5);
    const controls = [
      ...CONTROLS,
      { key: 'Tlag', label: 'Absorption lag', unit: 'min', scale: 1 / 60, min: 0, max: 120, step: 1 },
    ];
    global.fetch = mockFetch({
      'meta.json': { ...META, vr: { ...META.vr, Tlag: 8 } },
      'params.json': { ...BASE_PARAMS, parameters: { ...BASE_PARAMS.parameters, Tlag: 846 } },
      'controls.json': controls,
    });
    const { appHost } = await createFixture(
      '<dbs-fmusim paramsurl="params.json" metaurl="meta.json" wasmurl="wasm.js" controlsurl="controls.json"></dbs-fmusim>',
      class {},
      [Fmusim],
    ).started;
    const el = appHost.querySelector('dbs-fmusim');
    const vm = CustomElement.for(el).viewModel;
    await waitUntil(() => vm.ready);

    const sliders = Array.from(vm.controlsBox.querySelectorAll('input[type=range]'));
    expect(sliders.length).toBeGreaterThan(0);
    for (const inp of sliders) {
      const min = Number(inp.min), step = Number(inp.step), value = Number(inp.value);
      const n = (value - min) / step;
      expect(Math.abs(n - Math.round(n))).toBeLessThan(1e-9);   // value sits ON the grid
      expect(value).toBeGreaterThanOrEqual(min);
      expect(value).toBeLessThanOrEqual(Number(inp.max));
    }
    // and the grid anchoring cost at most one step of range below the configured floor
    const lag = sliders.find(i => Math.abs(Number(i.value) - 14.1) < 1e-9);
    expect(lag).toBeDefined();
    expect(Number(lag.min)).toBeGreaterThan(-1);
    expect(Number(lag.min)).toBeLessThanOrEqual(0);
    // the model value the FMU will receive is the record's own, untouched
    expect(vm.cur.parameters.Tlag).toBeCloseTo(846, 9);
    expect(vm.refRows[0].verdict).toBe('OK');
  });

  // ── sweep payloads (the PD exposure-response templates) ──────────────────────────────────
  // x_axis marks a payload whose simulated time IS the swept exposure. The component then
  // reads the swept variable beside the observable, plots response against it in the
  // record's display units, and checks reference_points (closed-form responses at given
  // exposures) instead of a peak.
  function makeSweepModule() {
    const M = makeFakeModule(0);
    // vr 1 = exposure (grows with each getReal call, like exposure_per_s * time would),
    // vr 3 = response = E0 + Emax * x / (EC50 + x) with the argatroban Cox_2004 numbers.
    let calls = 0;
    const E0 = 148, Emax = 316, EC50 = 1.92e-3, stop = 19200, perS = 1e-6, steps = 1000;
    M.cwrap = name => {
      if (name === 'fmi2GetReal') {
        return (inst, qPtr, count, outPtr) => {
          const x = perS * (stop / steps) * calls;   // first read is t = 0 → exposure 0
          calls += 1;
          const vrs = new Uint32Array(M.HEAPU8.buffer, qPtr, count);
          const out = new Float64Array(M.HEAPU8.buffer, outPtr, count);
          for (let i = 0; i < count; i++) out[i] = vrs[i] === 1 ? x : E0 + Emax * x / (EC50 + x);
          return 0;
        };
      }
      return makeFakeModule(0).cwrap(name);
    };
    return M;
  }

  const SWEEP_META = {
    model: 'Pharmacolibrary.Pharmacodynamic.SigmoidEmaxSweep', model_identifier: 'FakeFactoryFmusimTest',
    guid: '{fake}', tolerance: 1e-6,
    vr: { effect: 0, exposure: 1, frac: 2, response: 3, E0: 4, EC50: 5, Emax: 6, exposure_per_s: 7, gamma: 8 },
    parameters: { E0: 0, EC50: 1, Emax: 1, exposure_per_s: 1, gamma: 1 },
  };
  const SWEEP_PARAMS = {
    template: 'PD_SigmoidEmaxSweep',
    parameters: { E0: 148, Emax: 316, EC50: 1.92e-3, gamma: 1, exposure_per_s: 1e-6 },
    observables: ['response'],
    reference_points: { '0': 148, '0.00192': 306 },
    reference_peaks: {},
    stop_time: 19200,
    x_axis: { variable: 'exposure', per_s: 1e-6, display_unit: 'ng/mL', factor: 1e-6 },
    y_axis: { label: 'response', display_unit: 'sec', factor: 1 },
  };
  const SWEEP_CONTROLS = [
    { key: 'Emax', label: 'Emax', unit: 'sec', scale: 1, min: 0.2, max: 3, step: 0.05, mult: true },
    { key: 'EC50', label: 'EC50', unit: 'ng/mL', scale: 1e6, min: 0.1, max: 10, step: 0.1, mult: true },
    { key: 'stop_time', label: 'Exposure range', unit: 'ng/mL', scale: 1, min: 100, max: 100000, step: 100, sim: true },
  ];

  async function mountSweep() {
    window.FakeFactoryFmusimTest = () => makeSweepModule();
    global.fetch = mockFetch({ 'meta.json': SWEEP_META, 'params.json': SWEEP_PARAMS, 'controls.json': SWEEP_CONTROLS });
    const { appHost } = await createFixture(
      '<dbs-fmusim paramsurl="params.json" metaurl="meta.json" wasmurl="wasm.js" controlsurl="controls.json"></dbs-fmusim>',
      class {},
      [Fmusim],
    ).started;
    const vm = CustomElement.for(appHost.querySelector('dbs-fmusim')).viewModel;
    await waitUntil(() => vm.ready);
    return vm;
  }

  it('a sweep payload is checked at its reference points, not at a peak', async () => {
    const vm = await mountSweep();
    expect(vm.refRows).toHaveLength(2);
    expect(vm.refRows.map(r => r.verdict)).toEqual(['OK', 'OK']);
    expect(vm.refRows[1].o).toMatch(/^response @ 1.92e\+3 ng\/mL/);   // the EC50 row, in display units
    expect(vm.refRows[1].ref).toBe('306.0 sec');
  });

  it('a sweep reads the swept variable as x and steps the whole range, dose pulse or not', async () => {
    const vm = await mountSweep();
    const res = vm.simulate(vm.cur);
    expect(res.sweep).toBe('exposure');
    expect(res.step).toBeCloseTo(19200 / 1000, 9);         // not the 12 s dose-pulse step
    expect(res.xs.length).toBe(res.series.response.length);
    expect(res.xs[res.xs.length - 1]).toBeGreaterThan(res.xs[0]);
    expect(res.outs).toEqual(['response']);                // exposure is x, not an observable
    expect(vm.plotNote === '' || /end of sweep/.test(vm.plotNote)).toBe(true);  // jsdom has no canvas
  });

  it('editing a sweep slider withholds the point verdicts like a peak verdict', async () => {
    const vm = await mountSweep();
    vm.cur.parameters.EC50 *= 2;
    vm.run();
    expect(vm.refRows.every(r => /edited/.test(r.verdict))).toBe(true);
  });
});
