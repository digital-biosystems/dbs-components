import { ChartjsGeo } from '../src/chartjsgeo/chartjs-geo.js';

function makeGeo(overrides = {}) {
  const g = Object.create(ChartjsGeo.prototype);
  Object.assign(g, {
    datasrc: '',
    countriessrc: '',
    continent: '',
    geochart: null,
    countryDataDesc: {},
    projecturls: [],
    countryName: '',
    chart: null,
    currentProjection: 'equalEarth',
  }, overrides);
  return g;
}

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  console.log.mockRestore();
  console.warn.mockRestore();
});

describe('ChartjsGeo.parseCSV', () => {
  it('parses simple cells', () => {
    expect(makeGeo().parseCSV('a,b\nc,d')).toEqual([['a', 'b'], ['c', 'd']]);
  });

  it('handles quoted commas and CRLF', () => {
    expect(makeGeo().parseCSV('"a,b",c\r\nd,e')).toEqual([['a,b', 'c'], ['d', 'e']]);
  });

  it('handles escaped quotes', () => {
    expect(makeGeo().parseCSV('"d""e",f')).toEqual([['d"e', 'f']]);
  });
});

describe('ChartjsGeo.showSelected', () => {
  const ROW = ['Country', 'US', 'Pub', 'Project', 'http://a / http://b', 'x', 'y', 'Active', '3', 'z'];

  it('populates fields and splits urls', () => {
    const g = makeGeo({ countryDataDesc: { 840: ROW } });
    g.showSelected(840);
    expect(g.countryName).toBe('Country');
    expect(g.projectName).toBe('Project');
    expect(g.projectPublication).toBe('Pub');
    expect(g.projectStatus).toBe('3');
    expect(g.projectStatusText).toBe('Active');
    expect(g.projecturls).toEqual(['http://a', 'http://b']);
  });

  it('clears urls when empty and warns on miss', () => {
    const g = makeGeo({ countryDataDesc: { 840: [...ROW.slice(0, 4), '', ...ROW.slice(5)] } });
    g.showSelected(840);
    expect(g.projecturls).toEqual([]);
    const g2 = makeGeo({ countryDataDesc: {} });
    g2.showSelected(999);
    expect(console.warn).toHaveBeenCalled();
  });

  it('warns when countryDataDesc is null', () => {
    makeGeo({ countryDataDesc: null }).showSelected(1);
    expect(console.warn).toHaveBeenCalled();
  });
});

describe('ChartjsGeo.bound hash parsing', () => {
  const realHash = window.location.hash;

  afterEach(() => {
    window.location.hash = realHash;
  });

  function boundWithHash(hash, overrides = {}) {
    window.location.hash = hash;
    const g = makeGeo({ datasrc: 'default-src', ...overrides });
    g.bound();
    return g;
  }

  it('keeps defaults on empty hash', () => {
    const g = boundWithHash('');
    expect(g.datasrc).toBe('default-src');
    expect(g.continent).toBe('');
  });

  it('takes datasrc and continent from hash', () => {
    const g = boundWithHash('#http://example.com/data.csv&europe');
    expect(g.datasrc).toBe('http://example.com/data.csv');
    expect(g.continent).toBe('europe');
  });
});

describe('ChartjsGeo projection switches', () => {
  function stubChart() {
    return {
      options: { scales: { projection: {} } },
      scales: { projection: { projection: { rotate: jest.fn() } } },
      chartArea: { width: 800, height: 400 },
      update: jest.fn(),
    };
  }

  it('switchToEurope sets scale/offset and updates', () => {
    const g = makeGeo({ chart: stubChart() });
    g.switchToEurope();
    expect(g.chart.options.scales.projection.projectionScale).toBe(4);
    expect(g.chart.options.scales.projection.projectionOffset).toEqual([0, 4 * (3 / 8 * 400)]);
    expect(g.chart.update).toHaveBeenCalled();
  });

  it('switchToWorld resets scale/offset', () => {
    const g = makeGeo({ chart: stubChart() });
    g.switchToWorld();
    expect(g.chart.options.scales.projection.projectionScale).toBe(1);
    expect(g.chart.options.scales.projection.projectionOffset).toEqual([0, 0]);
    expect(g.chart.update).toHaveBeenCalled();
  });

  it('resetView switches to equalEarth world view', () => {
    const g = makeGeo({ chart: stubChart() });
    const spy = jest.spyOn(g, 'switchProjection').mockImplementation(() => {});
    g.resetView();
    expect(spy).toHaveBeenCalledWith('equalEarth');
    expect(g.chart.update).toHaveBeenCalled();
    spy.mockRestore();
  });
});
