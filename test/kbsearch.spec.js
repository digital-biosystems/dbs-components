import { Kbsearch } from '../src/kbsearch/kbsearch.js';

function makeKb(overrides = {}) {
  const k = Object.create(Kbsearch.prototype);
  Object.assign(k, {
    showinput: false,
    caseSensitive: false,
    query: '',
    result: [],
    ea: { publish: jest.fn(), subscribe: jest.fn(() => ({ dispose: jest.fn() })) },
    debouncedSearch: jest.fn(),
  }, overrides);
  return k;
}

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  console.log.mockRestore();
});

describe('Kbsearch.search', () => {
  it('no-ops on short queries', () => {
    const k = makeKb({ query: 'a' });
    k.search();
    expect(k.ea.publish).not.toHaveBeenCalled();
    expect(k.result).toEqual([]);
  });

  it('finds case-insensitive matches and publishes', () => {
    const k = makeKb({ query: 'iron deficiency', caseSensitive: false });
    k.search();
    expect(k.result.length).toBeGreaterThan(0);
    expect(k.ea.publish).toHaveBeenCalledWith('kbsearch:result', { query: 'iron deficiency', result: k.result });
    const names = k.result.map(([, v]) => v.name);
    expect(names.some((n) => n.toLowerCase().includes('iron deficiency'))).toBe(true);
  });

  it('caseSensitive=true requires exact case', () => {
    const lower = makeKb({ query: 'iron deficiency', caseSensitive: true });
    lower.search();
    const upper = makeKb({ query: 'Iron Deficiency', caseSensitive: true });
    upper.search();
    expect(upper.result.length).toBeGreaterThanOrEqual(lower.result.length);
    // lowercase query must not match the capitalized entry
    const lowerNames = lower.result.map(([, v]) => v.name);
    expect(lowerNames.some((n) => n.includes('Iron Deficiency Anemia'))).toBe(false);
  });
});

describe('Kbsearch.get', () => {
  it('publishes knowledge entry for valid id', () => {
    const k = makeKb();
    k.get('RULE_DX_01');
    expect(k.ea.publish).toHaveBeenCalledWith('kbsearch:result', expect.objectContaining({ name: expect.stringContaining('Iron') }));
  });

  it('publishes nothing for unknown id', () => {
    const k = makeKb();
    k.get('NO_SUCH_ID');
    expect(k.ea.publish).not.toHaveBeenCalled();
  });
});

describe('Kbsearch lifecycle', () => {
  it('bound() subscribes twice and coerces showinput string', () => {
    const k = makeKb({ showinput: 'true' });
    k.bound();
    expect(k.ea.subscribe).toHaveBeenCalledTimes(2);
    expect(k.ea.subscribe).toHaveBeenCalledWith('kbsearch:query', expect.any(Function));
    expect(k.ea.subscribe).toHaveBeenCalledWith('kbget:result', expect.any(Function));
    expect(k.showinput).toBe(true);
    expect(window.DbsKbsearch).toBe(k.ea);
    delete window.DbsKbsearch;
  });

  it('queryChanged / caseSensitiveChanged trigger debounced search', () => {
    const k = makeKb();
    k.queryChanged('ab', 'a');
    k.caseSensitiveChanged(true, false);
    expect(k.debouncedSearch).toHaveBeenCalledTimes(2);
  });

  it('unbinding disposes subscriptions', () => {
    const d1 = jest.fn();
    const d2 = jest.fn();
    const k = makeKb();
    k.myEventSubscription = { dispose: d1 };
    k.myEventSubscription2 = { dispose: d2 };
    k.unbinding();
    expect(d1).toHaveBeenCalled();
    expect(d2).toHaveBeenCalled();
  });
});
