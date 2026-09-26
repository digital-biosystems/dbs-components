import { Chartjs3Base } from '../src/chartjs/chartjs3-base.js';
import { ChartjsTimeBase } from '../src/chartjs/chartjs-time-base.js';
import { Chartjs3 } from '../src/chartjs/chartjs3.js';
import { Chartjs4 } from '../src/chartjs/chartjs4.js';
import { Pgxchartd } from '../src/chartjs/pgxchartd.js';
import { Chart } from 'chart.js/auto';

function makeTimeBase(overrides = {}) {
  const t = Object.create(ChartjsTimeBase.prototype);
  Object.assign(t, {
    fromid: 'test',
    labels: 'a,b',
    refindex: '0',
    timedenomfixed: 1,
    maxdata: 1024,
    labelxaxis: '',
    labelyaxis: '',
    demodata: false,
    labelsRaw: [],
    operation: [],
    ea: { subscribe: jest.fn(), publish: jest.fn() },
    chart: null,
  }, overrides);
  return t;
}

function stubChart(nDatasets = 2) {
  return {
    data: { labels: [], datasets: Array.from({ length: nDatasets }, () => ({ data: [] })) },
    options: {
      tooltips: { enabled: true },
      hover: { mode: 'nearest', animationDuration: 400 },
    },
    canvas: { style: {} },
    tooltip: undefined,
    update: jest.fn(),
  };
}

describe('Chartjs3Base.bound', () => {
  it('registers annotation plugin and registerables', () => {
    const spy = jest.spyOn(Chart, 'register').mockImplementation(() => {});
    try {
      new Chartjs3Base().bound();
      expect(spy).toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });
});

describe('ChartjsTimeBase.bound parsing', () => {
  it('parses comma refindex into refindices', () => {
    const t = makeTimeBase({ refindex: '0,2' });
    t.bound();
    expect(t.refindices).toEqual(['0', '2']);
    expect(t.labelsRaw).toEqual(['a', 'b']);
  });

  it('parses range refindex into start/count/end', () => {
    const t = makeTimeBase({ refindex: '1-3' });
    t.bound();
    expect(t.refindex).toBe(1);
    expect(t.refvalues).toBe(3);
    expect(t.refendindex).toBe(4);
  });

  it('parses single refindex', () => {
    const t = makeTimeBase({ refindex: '5' });
    t.bound();
    expect(t.refindex).toBe(5);
    expect(t.refvalues).toBe(1);
    expect(t.refendindex).toBe(6);
  });

  it('handles numeric refindex and string timedenom', () => {
    const t = makeTimeBase({ refindex: 2, timedenom: '10', timedenomfixed: '2', maxdata: '512', demodata: 'true' });
    t.bound();
    expect(t.refvalues).toBe(1);
    expect(t.refendindex).toBe(3);
    expect(t.timedenom).toBe(10);
    expect(t.timeoperation(100)).toBe('10.00');
    expect(t.maxdata).toBe(512);
    expect(t.demodata).toBe(true);
  });

  it('defaults timeoperation to identity without timedenom', () => {
    const t = makeTimeBase({ timedenom: undefined });
    t.bound();
    expect(t.timeoperation(7)).toBe(7);
  });
});

describe('ChartjsTimeBase.handleValueChange / resetChart', () => {
  it('pushes values, applies operation, enforces maxdata', () => {
    const t = makeTimeBase({ refindex: 0, maxdata: 2 });
    t.refindex = 0;
    t.refvalues = 2;
    t.refendindex = 2;
    t.timeoperation = (x) => x;
    t.operation = [(x) => x * 10, (x) => x + 1];
    t.chart = stubChart(2);
    t.handleValueChange({ data: [1, 2], time: 100 });
    t.handleValueChange({ data: [3, 4], time: 101 });
    t.handleValueChange({ data: [5, 6], time: 102 });
    expect(t.chart.data.datasets[0].data).toEqual([30, 50]);
    expect(t.chart.data.datasets[1].data).toEqual([5, 7]);
    expect(t.chart.data.labels).toEqual([101, 102]);
    expect(t.chart.update).toHaveBeenCalled();
  });

  it('supports refindices list form', () => {
    const t = makeTimeBase({});
    t.refindices = ['0', '2'];
    t.timeoperation = (x) => x;
    t.chart = stubChart(2);
    t.handleValueChange({ data: [10, 99, 30], time: 1 });
    expect(t.chart.data.datasets[0].data).toEqual([10]);
    expect(t.chart.data.datasets[1].data).toEqual([30]);
  });

  it('resetChart empties datasets and labels', () => {
    const t = makeTimeBase({});
    t.chart = stubChart(2);
    t.chart.data.datasets[0].data = [1, 2];
    t.chart.data.labels = [1, 2];
    t.resetChart();
    expect(t.chart.data.datasets[0].data).toEqual([]);
    expect(t.chart.data.labels).toEqual([]);
    expect(t.chart.update).toHaveBeenCalled();
  });

  it('resetChart is a no-op without chart', () => {
    expect(() => makeTimeBase({ chart: null }).resetChart()).not.toThrow();
  });

  it('subscribeToFmiEvents subscribes to four channels', () => {
    const t = makeTimeBase({ fromid: 'pgpk' });
    t.subscribeToFmiEvents();
    const channels = t.ea.subscribe.mock.calls.map((c) => c[0]);
    expect(channels).toEqual(['fmidata:pgpk', 'fmireset:pgpk', 'fmistart:pgpk', 'fmistop:pgpk']);
  });

  it('buildBasePluginsConfig returns legend config', () => {
    const cfg = makeTimeBase({}).buildBasePluginsConfig();
    expect(cfg.legend.labels.boxWidth).toBe(8);
  });
});

describe('Chartjs3 time helpers', () => {
  function makeChart3(overrides = {}) {
    const c = Object.create(Chartjs3.prototype);
    Object.assign(c, {
      therapLevel: 0.005,
      toxicLevel: 0.012,
      xvalueunit: 'seconds',
      labels: 'patient, , ,population norm, , ',
      labelxaxis: 'Time [seconds]',
      labelyaxis: 'Concentration [g/l]',
      levellabels: 'therapeutic,toxic',
      levelvalues: '0.005,0.012',
      maxdata: 1024,
      timedenomfixed: 1,
      demodata: false,
      refindex: '0',
      operation: [],
      labelsRaw: [],
      ea: { subscribe: jest.fn(), publish: jest.fn() },
      chart: null,
    }, overrides);
    return c;
  }

  it.each([
    ['min', 'minutes'], ['m', 'minutes'], ['H', 'hours'], ['hr', 'hours'],
    ['d', 'days'], ['day', 'days'], ['sec', 'seconds'], ['bogus', 'seconds'],
  ])('normalizeTimeUnit(%p) === %p', (input, expected) => {
    expect(makeChart3().normalizeTimeUnit(input)).toBe(expected);
  });

  it('divisors and axis labels', () => {
    const c = makeChart3();
    expect(c.getTimeDivisorForUnit('minutes')).toBe(60);
    expect(c.getTimeDivisorForUnit('hours')).toBe(3600);
    expect(c.getTimeDivisorForUnit('days')).toBe(86400);
    expect(c.getTimeDivisorForUnit('seconds')).toBe(1);
    expect(c.getTimeAxisLabel('hours')).toBe('Time [hours]');
    expect(c.formatTimeValue('nan')).toBe('nan');
    expect(c.formatTimeValue(3600 / 3600)).toBe(1);
  });

  it('bound() derives timedenom and xlabel without explicit timedenom', () => {
    const c = makeChart3({ xvalueunit: 'hours', timedenom: undefined });
    c.bound();
    expect(c.timedenom).toBe(3600);
    expect(c.labelxaxis).toBe('Time [hours]');
    expect(c.timeoperation(7200)).toBe(2);
    expect(c.levell).toEqual(['therapeutic', 'toxic']);
  });

  it('xvalueunitChanged rescales labels and axis title', () => {
    const c = makeChart3({ xvalueunit: 'seconds', timedenom: undefined });
    c.bound();
    c.chart = stubChart(0);
    c.chart.options.scales = { x: { title: { text: '' } } };
    c.chart.data.labels = [60, 120]; // seconds
    c.xvalueunitChanged('minutes', 'seconds');
    expect(c.labelxaxis).toBe('Time [minutes]');
    expect(c.chart.data.labels).toEqual([1, 2]);
    expect(c.chart.update).toHaveBeenCalled();
  });

  it('therap/toxic level changes update annotations', () => {
    const c = makeChart3();
    c.chart = stubChart(0);
    c.chart.options.plugins = { annotation: { annotations: { line1: {}, line2: {} } } };
    c.therapLevelChanged(0.007);
    c.toxicLevelChanged(0.02);
    expect(c.chart.options.plugins.annotation.annotations.line1.yMin).toBe(0.007);
    expect(c.chart.options.plugins.annotation.annotations.line2.yMax).toBe(0.02);
    expect(c.chart.update).toHaveBeenCalledTimes(2);
  });

  it('labelyaxisChanged updates y title', () => {
    const c = makeChart3();
    c.chart = stubChart(0);
    c.chart.options.scales = { y: { title: { text: '' } } };
    c.labelyaxisChanged('New Y');
    expect(c.chart.options.scales.y.title.text).toBe('New Y');
  });
});

describe('Chartjs4.bound / Pgxchartd', () => {
  it('coerces pointRadius and parses timedenom string', () => {
    const c = Object.create(Chartjs4.prototype);
    Object.assign(c, {
      labelxaxis: 'Time [s]', pointRadius: '3', maxdata: 2048, type: 'line',
      timedenom: '3600', timedenomfixed: 1, demodata: false, labels: 't,a',
      refindex: '0', operation: [], labelsRaw: [],
      ea: { subscribe: jest.fn(), publish: jest.fn() }, chart: null,
    });
    c.bound();
    expect(c.pointRadius).toBe(3);
    expect(c.timedenom).toBe(3600);
  });

  it('toggleControls flips showControls', () => {
    const p = Object.create(Pgxchartd.prototype);
    Object.assign(p, { drugname: 'Ibuprofen', showControls: false, element: document.createElement('div') });
    p.toggleControls();
    expect(p.showControls).toBe(true);
    p.toggleControls();
    expect(p.showControls).toBe(false);
  });
});
