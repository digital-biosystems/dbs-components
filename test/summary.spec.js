import { Summary } from '../src/summary/summary.js';

// Summary constructor only binds handlers; `element = resolve(Element)`
// field requires DI, so bypass construction.
function makeSummary(overrides = {}) {
  const s = Object.create(Summary.prototype);
  Object.assign(s, {
    template: '',
    placeholder: '-',
    scopeid: '',
    element: document.createElement('div'),
    values: {},
    renderedText: '',
  }, overrides);
  // replicate constructor binding
  s.handleChoice = Summary.prototype.handleChoice.bind(s);
  s.handleReset = Summary.prototype.handleReset.bind(s);
  return s;
}

describe('Summary.render', () => {
  it('replaces tokens and falls back to placeholder', () => {
    const s = makeSummary({ template: 'A {g1} B {g2}', placeholder: '-', values: { g1: 'x' } });
    expect(s.render()).toBe('A x B -');
  });

  it('coerces non-string template to empty', () => {
    const s = makeSummary({ template: null, values: {} });
    expect(s.render()).toBe('');
  });

  it('renders empty string values as placeholder', () => {
    const s = makeSummary({ template: '{g1}', placeholder: '-', values: { g1: '' } });
    expect(s.render()).toBe('-');
  });
});

describe('Summary.handleChoice', () => {
  it('stores label by group and re-renders', () => {
    const s = makeSummary({ template: 'weight: {weight}', placeholder: '-' });
    s.binding();
    expect(s.renderedText).toBe('weight: -');
    s.handleChoice({ detail: { group: 'weight', label: '70kg' } });
    expect(s.values).toEqual({ weight: '70kg' });
    expect(s.renderedText).toBe('weight: 70kg');
  });

  it('ignores events without group', () => {
    const s = makeSummary({ template: '{a}' });
    s.handleChoice({ detail: {} });
    s.handleChoice(null);
    expect(s.values).toEqual({});
  });

  it('scopeid isolates mismatched scopes', () => {
    const s = makeSummary({ template: '{g}', scopeid: 'demo' });
    s.handleChoice({ detail: { group: 'g', label: 'x', scope: 'other' } });
    expect(s.values).toEqual({});
    s.handleChoice({ detail: { group: 'g', label: 'x', scope: 'demo' } });
    expect(s.values).toEqual({ g: 'x' });
  });

  it('accepts events without scope when scopeid is set', () => {
    const s = makeSummary({ template: '{g}', scopeid: 'demo' });
    s.handleChoice({ detail: { group: 'g', label: 'y' } });
    expect(s.values).toEqual({ g: 'y' });
  });
});

describe('Summary.handleReset / lifecycle', () => {
  it('clears values and re-renders', () => {
    const s = makeSummary({ template: '{g}', values: { g: 'x' } });
    s.handleReset({ detail: {} });
    expect(s.values).toEqual({});
    expect(s.renderedText).toBe('-');
  });

  it('reset with mismatched scope is ignored', () => {
    const s = makeSummary({ template: '{g}', scopeid: 'demo', values: { g: 'x' } });
    s.handleReset({ detail: { scope: 'other' } });
    expect(s.values).toEqual({ g: 'x' });
  });

  it('templateChanged / placeholderChanged re-render', () => {
    const s = makeSummary({ template: '{g}', placeholder: '-', values: {} });
    s.templateChanged();
    expect(s.renderedText).toBe('-');
    s.placeholder = '?';
    s.placeholderChanged();
    expect(s.renderedText).toBe('?');
  });

  it('attached/detaching manage document listeners', () => {
    const s = makeSummary();
    const add = jest.spyOn(document, 'addEventListener');
    const remove = jest.spyOn(document, 'removeEventListener');
    s.attached();
    expect(add).toHaveBeenCalledWith('dbs-choice', s.handleChoice);
    expect(add).toHaveBeenCalledWith('dbs-choice-reset', s.handleReset);
    s.detaching();
    expect(remove).toHaveBeenCalledWith('dbs-choice', s.handleChoice);
    expect(remove).toHaveBeenCalledWith('dbs-choice-reset', s.handleReset);
    add.mockRestore();
    remove.mockRestore();
  });
});
