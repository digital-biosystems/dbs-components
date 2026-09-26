import { Range } from '../src/chartjs/range.js';

// Range uses resolve(IEventAggregator) in its constructor, so bypass DI.
function makeRange(overrides = {}) {
  const r = Object.create(Range.prototype);
  Object.assign(r, {
    value: 1,
    ticks: [],
    id: '',
    label: '',
    min: 0,
    max: 1,
    step: 0.1,
    tickstep: 0.5,
    default: 0.1,
    ea: { publish: jest.fn() },
  }, overrides);
  return r;
}

beforeEach(() => {
  jest.useRealTimers();
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  console.log.mockRestore();
});

describe('Range.bound', () => {
  it('coerces string min/max/step and value from default', () => {
    const r = makeRange({ min: '0', max: '10', step: '0.5', tickstep: '2', default: '3' });
    r.bound();
    expect(r.min).toBe(0);
    expect(r.max).toBe(10);
    expect(r.step).toBe(0.5);
    expect(r.tickstep).toBe(2);
    expect(r.value).toBe(3);
  });

  it('derives tickstep from range when not a string', () => {
    const r = makeRange({ min: 0, max: 10, tickstep: 0.5 });
    r.bound();
    expect(r.tickstep).toBe(2);
  });

  it('falls back to min when default is not a string', () => {
    const r = makeRange({ min: 4, max: 10, tickstep: '1', default: 0.1 });
    r.bound();
    expect(r.value).toBe(4);
  });
});

describe('Range.generateTicks', () => {
  it('generates ticks with decimals from float step', () => {
    const r = makeRange({ min: 0, max: 1, tickstep: 0.5, step: 0.1 });
    r.generateTicks();
    expect(r.ticks).toEqual(['0.0', '0.5', '1.0']);
  });

  it('generates integer ticks for integer step', () => {
    const r = makeRange({ min: 0, max: 4, tickstep: 2, step: 1 });
    r.generateTicks();
    expect(r.ticks).toEqual(['0', '2', '4']);
  });
});

describe('Range.valueChanged', () => {
  it('coerces strings and publishes fmiinput after timeout', () => {
    jest.useFakeTimers();
    const r = makeRange({ id: 'dosage', value: 0 });
    r.valueChanged('3.5');
    expect(r.value).toBe(3.5);
    expect(r.ea.publish).not.toHaveBeenCalled();
    jest.runAllTimers();
    expect(r.ea.publish).toHaveBeenCalledWith('fmiinput', { detail: { id: 'dosage', value: 3.5 } });
  });
});

describe('Range.minChanged / maxChanged', () => {
  it('recoerces and regenerates ticks', () => {
    const r = makeRange({ min: 0, max: 1, tickstep: 0.5, step: 1 });
    r.generateTicks();
    const before = [...r.ticks];
    r.min = '0';
    r.minChanged();
    r.max = '4';
    r.maxChanged();
    expect(r.min).toBe(0);
    expect(r.max).toBe(4);
    expect(r.ticks).not.toEqual(before);
    expect(r.ticks[0]).toBe('0');
  });
});
