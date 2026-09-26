import { FmiEventHandlers } from '../src/fmi/FmiEventHandlers.js';

function makeFmi(overrides = {}) {
  return Object.assign({
    changeinputs: {},
    inputreferences: {},
    isOnestep: false,
    isOneshot: false,
    handleStep: jest.fn(),
    debounceShot: jest.fn(),
    debounceStep: jest.fn(),
    startevent: jest.fn(),
    stopevent: jest.fn(),
    shot: jest.fn(),
    step: jest.fn(),
    inputManager: { registerInputs: jest.fn(), deregisterInputs: jest.fn() },
  }, overrides);
}

beforeEach(() => {
  jest.useRealTimers();
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  console.log.mockRestore();
  jest.useRealTimers();
});

describe('FmiEventHandlers.handleValueChange', () => {
  it('prefers detail.id / detail.value over target', () => {
    const fmi = makeFmi();
    const h = new FmiEventHandlers(fmi);
    h.handleValueChange({ detail: { id: 's1', value: '5' }, target: { id: 'other', value: '9' } });
    expect(fmi.changeinputs.s1).toEqual([{ id: 's1', value: '5' }]);
  });

  it('falls back to target id/value', () => {
    const fmi = makeFmi();
    const h = new FmiEventHandlers(fmi);
    h.handleValueChange({ target: { id: 's2', value: '7' } });
    expect(fmi.changeinputs.s2).toEqual([{ id: 's2', value: '7' }]);
  });

  it('falls back to grandparent id when target has no id', () => {
    const fmi = makeFmi();
    const h = new FmiEventHandlers(fmi);
    h.handleValueChange({
      target: { id: '', value: '3', parentElement: { parentElement: { id: 'gp' } } },
    });
    expect(fmi.changeinputs.gp).toEqual([{ id: 'gp', value: '3' }]);
  });

  it('sets resetBeforeChange for fixed inputs and triggers oneshot', () => {
    const fmi = makeFmi({ isOneshot: true, inputreferences: { s1: { fixed: true } } });
    const h = new FmiEventHandlers(fmi);
    h.handleValueChange({ detail: { id: 's1', value: '1' }, target: {} });
    expect(fmi.resetBeforeChange).toBe(true);
    expect(fmi.debounceShot).toHaveBeenCalled();
  });

  it('schedules handleStep for onestep mode', () => {
    jest.useFakeTimers();
    const fmi = makeFmi({ isOnestep: true });
    const h = new FmiEventHandlers(fmi);
    h.handleValueChange({ target: { id: 's1', value: '1' } });
    expect(fmi.handleStep).not.toHaveBeenCalled();
    jest.runAllTimers();
    expect(fmi.handleStep).toHaveBeenCalled();
  });
});

describe('FmiEventHandlers.handleDetailChange', () => {
  it('stores valuereference shape', () => {
    const fmi = makeFmi();
    const h = new FmiEventHandlers(fmi);
    h.handleDetailChange({ detail: { id: 'd1', valuereference: 42, value: 3.5 } });
    expect(fmi.changeinputs.d1).toEqual([{ valuereference: 42, value: 3.5, fromid: 'd1' }]);
  });
});

describe('FmiEventHandlers delegation', () => {
  it('delegates start/stop/shot/step', () => {
    const fmi = makeFmi();
    const h = new FmiEventHandlers(fmi);
    const evt = { foo: 1 };
    h.handleStart(evt);
    h.handleStop(evt);
    h.handleShot(evt);
    h.handleStep(evt);
    expect(fmi.startevent).toHaveBeenCalledWith(evt);
    expect(fmi.stopevent).toHaveBeenCalledWith(evt);
    expect(fmi.shot).toHaveBeenCalledWith(evt);
    expect(fmi.step).toHaveBeenCalledWith(evt);
  });

  it('handleRegister re-registers and triggers debounce per flags', () => {
    const fmi = makeFmi({ isOnestep: true, isOneshot: true });
    const h = new FmiEventHandlers(fmi);
    h.handleRegister();
    expect(fmi.inputManager.deregisterInputs).toHaveBeenCalled();
    expect(fmi.inputManager.registerInputs).toHaveBeenCalled();
    expect(fmi.debounceStep).toHaveBeenCalled();
    expect(fmi.debounceShot).toHaveBeenCalled();
  });
});
