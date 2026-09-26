import { Value } from '../src/value/value.js';

// Value uses resolve(IEventAggregator) in its constructor, so bypass DI
// and test the pure logic methods directly.
function makeValue(overrides = {}) {
  const v = Object.create(Value.prototype);
  Object.assign(v, {
    fromid: '',
    refindex: 0,
    labels: 'value',
    convertors: '',
    min: 0,
    max: 1,
    lowcolor: 'w3-blue',
    midcolor: 'w3-green',
    highcolor: 'w3-red',
    lowtext: 'the value is too low',
    oktext: 'OK',
    hightext: 'too much',
    precision: 3,
    labelsRaw: [],
    refindices: [],
    operation: [],
    displayItems: [],
    subscriptions: [],
    ea: { publish: jest.fn(), subscribe: jest.fn() },
  }, overrides);
  return v;
}

describe('Value.parseRefIndices', () => {
  it.each([
    ['1,3,5', [1, 3, 5]],
    ['2-4', [2, 3, 4]],
    ['7', [7]],
    ['', [0]],
    ['x', [0]],
  ])('parses %p to %p', (input, expected) => {
    expect(makeValue().parseRefIndices(input)).toEqual(expected);
  });

  it('falls back to parseInt for inverted ranges', () => {
    // '5-2' fails the parts[1] >= parts[0] guard, parseInt('5-2') => 5
    expect(makeValue().parseRefIndices('5-2')).toEqual([5]);
  });

  it('passes through finite numbers', () => {
    expect(makeValue().parseRefIndices(3)).toEqual([3]);
  });

  it('returns [0] for non-string non-number input', () => {
    expect(makeValue().parseRefIndices(null)).toEqual([0]);
    expect(makeValue().parseRefIndices(undefined)).toEqual([0]);
  });
});

describe('Value.parseLabels / formatValue', () => {
  it('splits labels and falls back to value', () => {
    expect(makeValue().parseLabels('a, b')).toEqual(['a', 'b']);
    expect(makeValue().parseLabels('')).toEqual(['value']);
    expect(makeValue().parseLabels(null)).toEqual(['value']);
  });

  it('formats with precision and passes through non-numeric', () => {
    const v = makeValue({ precision: 2 });
    expect(v.formatValue('3.14159')).toBe('3.14');
    expect(v.formatValue('abc')).toBe('abc');
  });
});

describe('Value.classify', () => {
  it('classifies below/within/above range', () => {
    const v = makeValue({ min: 0, max: 10 });
    expect(v.classify(-1).status).toBe(v.lowtext);
    expect(v.classify(5).status).toBe(v.oktext);
    expect(v.classify(11).status).toBe(v.hightext);
  });

  it('treats NaN as mid/ok', () => {
    const v = makeValue();
    const result = v.classify('not-a-number');
    expect(result.color).toBe(v.midcolor);
    expect(result.status).toBe(v.oktext);
  });
});

describe('Value.handleValueChange', () => {
  it('maps refindices to display items with per-index operation', () => {
    const v = makeValue({
      refindices: [0, 2],
      labelsRaw: ['a', 'b'],
      operation: [(x) => x * 2, (x) => x + 1],
      precision: 3,
      min: 0,
      max: 1000,
    });
    v.handleValueChange({ data: [10, 20, 30] });
    expect(v.displayItems).toHaveLength(2);
    expect(v.displayItems[0].label).toBe('a');
    expect(v.displayItems[0].rawValue).toBe(20);
    expect(v.displayItems[1].label).toBe('b');
    expect(v.displayItems[1].rawValue).toBe(31);
  });

  it('falls back to first label and skips undefined data', () => {
    const v = makeValue({
      refindices: [0, 5],
      labelsRaw: ['only'],
      operation: [],
      min: 0,
      max: 1000,
    });
    v.handleValueChange({ data: [42] });
    expect(v.displayItems).toHaveLength(1);
    expect(v.displayItems[0].label).toBe('only');
    expect(v.displayItems[0].rawValue).toBe(42);
  });

  it('ignores events without data', () => {
    const v = makeValue({ refindices: [0], labelsRaw: ['a'] });
    v.handleValueChange(null);
    v.handleValueChange({});
    expect(v.displayItems).toEqual([]);
  });
});

describe('Value lifecycle helpers', () => {
  it('normalizeInputs coerces min/max/precision with fallbacks', () => {
    const v = makeValue({ min: 'bad', max: '5', precision: '2' });
    v.normalizeInputs();
    expect(v.min).toBe(0);
    expect(v.max).toBe(5);
    expect(v.precision).toBe(2);
  });

  it('refreshStatuses reclassifies after min/max change', () => {
    const v = makeValue({ min: 0, max: 10, precision: 3 });
    v.labelsRaw = ['a'];
    v.refindices = [0];
    v.handleValueChange({ data: [5] });
    expect(v.displayItems[0].status).toBe('OK');
    v.minChanged(6);
    expect(v.min).toBe(6);
    expect(v.displayItems[0].status).toBe(v.lowtext);
  });

  it('resetValues clears display items', () => {
    const v = makeValue({ displayItems: [{ label: 'a' }] });
    v.resetValues();
    expect(v.displayItems).toEqual([]);
  });

  it('ensureConvertorsFromAttribute does not overwrite existing operation', () => {
    const existing = [(x) => x];
    const v = makeValue({ operation: existing, convertors: '2,4' });
    v.ensureConvertorsFromAttribute();
    expect(v.operation).toBe(existing);
  });

  it('ensureConvertorsFromAttribute parses convertors when empty', () => {
    const v = makeValue({ operation: [], convertors: '2,4' });
    v.ensureConvertorsFromAttribute();
    expect(v.operation).toHaveLength(1);
    expect(v.operation[0](4)).toBe(2);
  });
});
