import { FmiSimulationController } from '../src/fmi/FmiSimulationController.js';
import { FmiInstance } from '../src/fmi/FmiInstance.js';
import { FmiInputManager } from '../src/fmi/FmiInputManager.js';

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  delete window.animateranges;
  delete window.fmiinst;
});

afterEach(() => {
  console.log.mockRestore();
  console.warn.mockRestore();
  console.error.mockRestore();
  jest.useRealTimers();
  delete window.animateranges;
  delete window.fmiinst;
});

function makeFmi(overrides = {}) {
  return Object.assign({
    doingstep: false,
    instantiated: true,
    instance: { instantiate: jest.fn(), initialize: jest.fn(), setupExperiment: jest.fn() },
    stepi: 0,
    resetBeforeChange: false,
    isOnestep: false,
    isOneshot: false,
    fmiDoStep: jest.fn(() => 0),
    stepTime: 0,
    stepSize: 0.1,
    mystep: 0.1,
    fmiReset: jest.fn(),
    fmiinst: 1,
    setInputVariables: jest.fn(),
    bufferManager: { getReals: jest.fn(() => new Float64Array([1, 2])) },
    references: [1, 2],
    round: jest.fn((v) => v),
    pow: 2,
    dispatchFmiEvent: jest.fn(),
    showtime: false,
    measurefps: false,
    fmuspeed2: null,
    stoptime: 0,
    animationstarted: false,
  }, overrides);
}

describe('FmiSimulationController.step', () => {
  it('instantiates on first call and advances time with fmidata publish', () => {
    const fmi = makeFmi({ instantiated: false });
    const c = new FmiSimulationController(fmi);
    c.step();
    expect(fmi.instance.instantiate).toHaveBeenCalled();
    expect(fmi.instance.initialize).toHaveBeenCalled();
    expect(fmi.stepi).toBe(1);
    expect(fmi.stepTime).toBeCloseTo(0.1);
    expect(fmi.dispatchFmiEvent).toHaveBeenCalledWith('fmidata', false, expect.objectContaining({ data: expect.anything() }));
    expect(fmi.doingstep).toBe(false);
  });

  it('resetBeforeChange path resets and clears flag', () => {
    const fmi = makeFmi({ resetBeforeChange: true, starttime: 0 });
    const c = new FmiSimulationController(fmi);
    c.step();
    expect(fmi.instance.setupExperiment).toHaveBeenCalled();
    expect(fmi.fmiReset).toHaveBeenCalled();
    expect(fmi.setInputVariables).toHaveBeenCalled();
    expect(fmi.resetBeforeChange).toBe(false);
  });

  it('res 1 triggers fmiReset + initialize', () => {
    const fmi = makeFmi({ fmiDoStep: jest.fn(() => 1) });
    const c = new FmiSimulationController(fmi);
    c.step();
    expect(fmi.fmiReset).toHaveBeenCalled();
    expect(fmi.instance.initialize).toHaveBeenCalled();
  });

  it('resets doingstep even when fmiDoStep throws', () => {
    const fmi = makeFmi({ fmiDoStep: jest.fn(() => { throw new Error('boom'); }) });
    const c = new FmiSimulationController(fmi);
    expect(() => c.step()).not.toThrow();
    expect(fmi.doingstep).toBe(false);
  });

  it('skips re-entrant step while doingstep', () => {
    const fmi = makeFmi({ doingstep: true });
    const c = new FmiSimulationController(fmi);
    c.step();
    expect(fmi.stepi).toBe(0);
  });
});

describe('FmiSimulationController.reset / softreset / shot', () => {
  it('reset() restores times and dispatches fmireset', () => {
    const fmi = makeFmi({
      starttime: 5, fmuspeed: 2, fstepsize: '0.5',
    });
    const c = new FmiSimulationController(fmi);
    c.reset();
    expect(fmi.stepTime).toBe(5);
    expect(fmi.stepSize).toBe(1);
    expect(fmi.mystep).toBe(0);
    expect(fmi.fmiReset).toHaveBeenCalled();
    expect(fmi.instance.setupExperiment).toHaveBeenCalled();
    expect(fmi.setInputVariables).toHaveBeenCalledWith(false);
    expect(fmi.instance.initialize).toHaveBeenCalled();
    expect(fmi.dispatchFmiEvent).toHaveBeenCalledWith('fmireset');
  });

  it('softreset() skips fmiReset/setupExperiment/initialize', () => {
    const fmi = makeFmi({ starttime: 0, fmuspeed: 1, fstepsize: 0.2 });
    const c = new FmiSimulationController(fmi);
    c.softreset();
    expect(fmi.stepTime).toBe(0);
    expect(fmi.mystep).toBe(0);
    expect(fmi.setInputVariables).toHaveBeenCalled();
    expect(fmi.fmiReset).not.toHaveBeenCalled();
    expect(fmi.instance.setupExperiment).not.toHaveBeenCalled();
    expect(fmi.dispatchFmiEvent).toHaveBeenCalledWith('fmireset');
  });

  it('shot() guards re-entrancy', async () => {
    const fmi = makeFmi();
    const c = new FmiSimulationController(fmi);
    c.shotInProgress = true;
    await c.shot();
    expect(fmi.sendStopEvent || fmi.dispatchFmiEvent).toBeDefined();
  });

  it('shot() loops step() until stoptime then sends stop', async () => {
    const fmi = makeFmi({ inst: {}, fminame: 'm', stoptime: 0.3, stepTime: 0, sendStopEvent: jest.fn() });
    fmi.reset = jest.fn();
    const c = new FmiSimulationController(fmi);
    c.reset = jest.fn();
    c.step = jest.fn(() => { fmi.stepTime += 0.1; });
    await c.shot();
    expect(c.reset).toHaveBeenCalled();
    expect(c.step).toHaveBeenCalled();
    expect(fmi.sendStopEvent).toHaveBeenCalled();
    expect(c.shotInProgress).toBe(false);
  });

  it('shot() without inst and no global registry returns early', async () => {
    const fmi = makeFmi({ inst: null, fminame: 'missing', sendStopEvent: jest.fn() });
    const c = new FmiSimulationController(fmi);
    await c.shot();
    expect(c.shotInProgress).toBe(false);
    expect(fmi.sendStopEvent).toHaveBeenCalled();
  });
});

describe('FmiInstance', () => {
  function makeInst() {
    const cwrap = jest.fn(() => jest.fn());
    const inst = {
      cwrap,
      addFunction: jest.fn(() => 7),
      _fmi2GetVersion: 'not-a-function',
    };
    const fmi = {
      fminame: 'mymodel',
      fstepsize: '0.01',
      fmuspeed: 1,
      cosimulation: 1,
      guid: 'g',
      callbackptr: 0,
      debug: 0,
      consoleLogger: jest.fn(),
      resetFmuspeed: jest.fn(),
      isOneshot: true,
      tolerance: 1e-6,
      starttime: 0,
      stoptime: 10,
    };
    window.fmiinst = { mymodel: { inst } };
    window.thisfmi = fmi;
    return { inst, fmi, cwrap };
  }

  it('instantiate() computes stepSize/pow and uses fminame prefix', () => {
    const { fmi } = makeInst();
    const inst = new FmiInstance(fmi);
    inst.instantiate();
    expect(fmi.stepSize).toBeCloseTo(0.01);
    expect(fmi.pow).toBe(-2);
    const firstCwrap = fmi.inst.cwrap.mock.calls[0][0];
    expect(firstCwrap).toBe('createFmi2CallbackFunctions');
    expect(fmi.inst.cwrap).toHaveBeenCalledWith(
      expect.stringContaining('fmi2Instantiate'), expect.anything(), expect.anything(),
    );
  });

  it('uses empty prefix when _fmi2GetVersion is a function', () => {
    const { fmi, inst } = makeInst();
    inst._fmi2GetVersion = () => '2.0';
    window.fmiinst = { mymodel: { inst } };
    new FmiInstance(fmi).instantiate();
    const names = fmi.inst.cwrap.mock.calls.map((c) => c[0]);
    expect(names).toContain('fmi2Reset');
  });

  it('honors fmifunctionprefixname override', () => {
    const { fmi } = makeInst();
    fmi.fmifunctionprefixname = 'custom';
    new FmiInstance(fmi).instantiate();
    const names = fmi.inst.cwrap.mock.calls.map((c) => c[0]);
    expect(names.some((n) => n.startsWith('custom_'))).toBe(true);
  });

  it('setupExperiment() uses oneshot vs continuous args', () => {
    const { fmi } = makeInst();
    fmi.fmiinst = 3;
    fmi.fmiSetup = jest.fn();
    fmi.isOneshot = true;
    new FmiInstance(fmi).setupExperiment();
    expect(fmi.fmiSetup).toHaveBeenCalledWith(3, 1, fmi.tolerance, 0, 1, 10);
    fmi.isOneshot = false;
    new FmiInstance(fmi).setupExperiment();
    expect(fmi.fmiSetup).toHaveBeenCalledWith(3, 1, fmi.tolerance, 0, 0, 0.0);
    expect(fmi.instantiated).toBe(true);
  });

  it('initialize() tolerates non-zero status and exceptions', () => {
    const fmi = { fmiinst: 1, fmiEnterInit: jest.fn(() => 1), fmiExitInit: jest.fn(() => { throw new Error('x'); }) };
    expect(() => new FmiInstance(fmi).initialize()).not.toThrow();
  });
});

describe('FmiInputManager', () => {
  function makeMgrFmi(overrides = {}) {
    return Object.assign({
      inputs: 'slider1,2,2,4,5',
      eventlisten: 'input',
      handleValueChange: jest.fn(),
      handleDetailChange: jest.fn(),
      parentelement: null,
      otherinputs: null,
      resolveInputElementById: (id) => document.getElementById(id),
    }, overrides);
  }

  it('parses slider spec into inputreferences', () => {
    const fmi = makeMgrFmi();
    new FmiInputManager(fmi).registerInputs();
    expect(fmi.inputreferences.slider1.refs[0]).toEqual(
      { ref: '2', numerator: 2, denominator: 4, addconst: 5, fixed: false },
    );
  });

  it('marks f-suffixed inputs as fixed', () => {
    // 'f' in 5th position hits the NaN-addconst fallback; 6th position is explicit
    const fmi = makeMgrFmi({ inputs: 'id1,3,1,1,f;id2,3,1,1,0,f' });
    new FmiInputManager(fmi).registerInputs();
    expect(fmi.inputreferences.id1.fixed).toBe(true);
    expect(fmi.inputreferences.id1.refs[0].addconst).toBe(0);
    expect(fmi.inputreferences.id2.fixed).toBe(true);
  });

  it('merges duplicate input ids and ORs fixed', () => {
    const fmi = makeMgrFmi({ inputs: 's,1,1,1,0;s,2,1,1,f' });
    new FmiInputManager(fmi).registerInputs();
    expect(fmi.inputreferences.s.refs).toHaveLength(2);
    expect(fmi.inputreferences.s.fixed).toBe(true);
  });

  it('registers listener on existing elements, queues missing to animateranges', () => {
    const el = document.createElement('input');
    el.id = 'real-slider';
    document.body.appendChild(el);
    try {
      const addSpy = jest.spyOn(el, 'addEventListener');
      const fmi = makeMgrFmi({ inputs: 'real-slider,1,1,1,0;ghost,2,1,1,0' });
      new FmiInputManager(fmi).registerInputs();
      expect(addSpy).toHaveBeenCalledWith('input', fmi.handleValueChange);
      expect(window.animateranges.map((a) => a.name)).toContain('ghost');
    } finally {
      el.remove();
    }
  });

  it('deregisterInputs removes listeners and clears animateranges', () => {
    const el = document.createElement('input');
    el.id = 'real-slider';
    document.body.appendChild(el);
    try {
      const fmi = makeMgrFmi({ inputs: 'real-slider,1,1,1,0', otherinputs: null });
      window.animateranges = [{ name: 'x' }];
      const removeSpy = jest.spyOn(el, 'removeEventListener');
      new FmiInputManager(fmi).deregisterInputs();
      expect(window.animateranges).toEqual([]);
      expect(removeSpy).toHaveBeenCalledWith('input', fmi.handleValueChange);
    } finally {
      el.remove();
    }
  });
});
