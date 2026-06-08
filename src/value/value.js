import { bindable, customElement, IEventAggregator, resolve } from 'aurelia';
import { parseConvertors } from '../utils/convertors.js';

@customElement('dbs-value')
export class Value {
  @bindable fromid = '';
  @bindable refindex = 0;
  @bindable labels = 'value';
  @bindable convertors = '';
  @bindable min = 0;
  @bindable max = 1;
  @bindable lowcolor = 'w3-blue';
  @bindable midcolor = 'w3-green';
  @bindable highcolor = 'w3-red';
  @bindable lowtext = 'the value is too low';
  @bindable oktext = 'OK';
  @bindable hightext = 'too much';
  @bindable precision = 3;

  labelsRaw = [];
  refindices = [];
  operation = [];
  displayItems = [];
  subscriptions = [];

  constructor() {
    this.ea = resolve(IEventAggregator);
  }

  binding() {
    this.normalizeInputs();
    this.labelsRaw = this.parseLabels(this.labels);
    this.refindices = this.parseRefIndices(this.refindex);
    this.ensureConvertorsFromAttribute();
  }

  attached() {
    if (!this.fromid) return;

    this.subscriptions.push(
      this.ea.subscribe(`fmidata:${this.fromid}`, msg => this.handleValueChange(msg)),
      this.ea.subscribe(`fmireset:${this.fromid}`, () => this.resetValues())
    );
  }

  detaching() {
    for (const sub of this.subscriptions) {
      if (sub && typeof sub.dispose === 'function') sub.dispose();
    }
    this.subscriptions = [];
  }

  convertorsChanged() {
    this.ensureConvertorsFromAttribute();
  }

  refindexChanged(newVal) {
    this.refindices = this.parseRefIndices(newVal);
  }

  labelsChanged(newVal) {
    this.labelsRaw = this.parseLabels(newVal);
  }

  minChanged(newVal) {
    this.min = this.toFiniteNumber(newVal, 0);
    this.refreshStatuses();
  }

  maxChanged(newVal) {
    this.max = this.toFiniteNumber(newVal, 1);
    this.refreshStatuses();
  }

  normalizeInputs() {
    this.min = this.toFiniteNumber(this.min, 0);
    this.max = this.toFiniteNumber(this.max, 1);
    this.precision = this.toFiniteNumber(this.precision, 3);
  }

  toFiniteNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  parseLabels(labels) {
    if (typeof labels !== 'string') return ['value'];
    const parsed = labels.split(',').map(x => x.trim()).filter(x => x.length > 0);
    return parsed.length > 0 ? parsed : ['value'];
  }

  parseRefIndices(refindex) {
    if (typeof refindex === 'number' && Number.isFinite(refindex)) return [refindex];
    if (typeof refindex !== 'string') return [0];

    const trimmed = refindex.trim();
    if (trimmed.length === 0) return [0];

    if (trimmed.includes(',')) {
      const indices = trimmed
        .split(',')
        .map(x => parseInt(x.trim(), 10))
        .filter(x => Number.isFinite(x));
      return indices.length > 0 ? indices : [0];
    }

    if (trimmed.includes('-')) {
      const parts = trimmed.split('-').map(x => parseInt(x.trim(), 10));
      if (parts.length === 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1]) && parts[1] >= parts[0]) {
        const indices = [];
        for (let i = parts[0]; i <= parts[1]; i++) indices.push(i);
        return indices;
      }
    }

    const single = parseInt(trimmed, 10);
    return Number.isFinite(single) ? [single] : [0];
  }

  ensureConvertorsFromAttribute() {
    if (this.operation && this.operation.length > 0) return;
    this.operation = parseConvertors(this.convertors);
  }

  formatValue(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return String(value);

    const decimals = Math.max(0, parseInt(this.precision, 10) || 0);
    return Number.parseFloat(numeric.toFixed(decimals)).toString();
  }

  classify(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return { color: this.midcolor, status: this.oktext };
    }

    if (numeric < this.min) {
      return { color: this.lowcolor, status: this.lowtext };
    }

    if (numeric > this.max) {
      return { color: this.highcolor, status: this.hightext };
    }

    return { color: this.midcolor, status: this.oktext };
  }

  handleValueChange(e) {
    if (!e || !e.data) return;

    const nextItems = [];
    for (let j = 0; j < this.refindices.length; j++) {
      const i = this.refindices[j];
      const rawValue = e.data[i];
      if (rawValue === undefined) continue;

      const convertedValue = (this.operation && this.operation[j])
        ? this.operation[j](rawValue)
        : rawValue;

      const label = this.labelsRaw[j] || this.labelsRaw[0] || `value${j + 1}`;
      const classification = this.classify(convertedValue);

      nextItems.push({
        label,
        rawValue: convertedValue,
        value: this.formatValue(convertedValue),
        color: classification.color,
        status: classification.status
      });
    }

    this.displayItems = nextItems;
  }

  refreshStatuses() {
    if (!this.displayItems || this.displayItems.length === 0) return;

    this.displayItems = this.displayItems.map(item => {
      const classification = this.classify(item.rawValue);
      return {
        ...item,
        value: this.formatValue(item.rawValue),
        color: classification.color,
        status: classification.status
      };
    });
  }

  resetValues() {
    this.displayItems = [];
  }
}
