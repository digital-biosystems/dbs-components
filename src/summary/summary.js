import { bindable, customElement, resolve } from 'aurelia';

@customElement('dbs-summary')
export class Summary {
  @bindable template = '';
  @bindable placeholder = '-';
  @bindable scopeid = '';

  element = resolve(Element);
  values = {};
  renderedText = '';

  constructor() {
    this.handleChoice = this.handleChoice.bind(this);
    this.handleReset = this.handleReset.bind(this);
  }

  binding() {
    this.renderedText = this.render();
  }

  attached() {
    document.addEventListener('dbs-choice', this.handleChoice);
    document.addEventListener('dbs-choice-reset', this.handleReset);
  }

  detaching() {
    document.removeEventListener('dbs-choice', this.handleChoice);
    document.removeEventListener('dbs-choice-reset', this.handleReset);
  }

  templateChanged() {
    this.renderedText = this.render();
  }

  placeholderChanged() {
    this.renderedText = this.render();
  }

  handleChoice(event) {
    const detail = event && event.detail ? event.detail : null;
    if (!detail || !detail.group) return;
    if (this.scopeid && detail.scope && detail.scope !== this.scopeid) return;

    this.values = { ...this.values, [detail.group]: detail.label };
    this.renderedText = this.render();
  }

  handleReset(event) {
    const detail = event && event.detail ? event.detail : null;
    if (this.scopeid && detail && detail.scope && detail.scope !== this.scopeid) return;

    this.values = {};
    this.renderedText = this.render();
  }

  render() {
    const template = typeof this.template === 'string' ? this.template : '';
    const placeholder = this.placeholder === undefined || this.placeholder === null
      ? '-'
      : String(this.placeholder);

    return template.replace(/\{([^}]+)\}/g, (match, key) => {
      const value = this.values[key.trim()];
      return value === undefined || value === null || value === '' ? placeholder : value;
    });
  }
}
