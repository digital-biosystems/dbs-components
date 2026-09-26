import { ButtonParams } from '../src/buttonparams/button-params.js';

function makeParams(overrides = {}) {
  const b = Object.create(ButtonParams.prototype);
  Object.assign(b, {
    title: 'Apply Parameters',
    idvalues: '',
    targetid: '',
    group: '',
    label: '',
    element: document.createElement('div'),
  }, overrides);
  return b;
}

describe('ButtonParams.parseIdValues', () => {
  it.each([
    ['a,1;b,2,3', [{ id: 'a', value: '1' }, { id: 'b', value: '2,3' }]],
    ['', []],
    ['nocomma', []],
    ['a,1;;b,2', [{ id: 'a', value: '1' }, { id: 'b', value: '2' }]],
  ])('parses %p', (input, expected) => {
    expect(makeParams({ idvalues: input }).parseIdValues()).toEqual(expected);
  });

  it('returns [] for non-string idvalues', () => {
    expect(makeParams({ idvalues: null }).parseIdValues()).toEqual([]);
    expect(makeParams({ idvalues: 42 }).parseIdValues()).toEqual([]);
  });

  it('trims whitespace around ids and values', () => {
    expect(makeParams({ idvalues: '  a , 1 ' }).parseIdValues()).toEqual([{ id: 'a', value: '1' }]);
  });
});

describe('ButtonParams.findElementByIdAcrossRoots', () => {
  it('returns null for empty id', () => {
    expect(makeParams().findElementByIdAcrossRoots('')).toBeNull();
    expect(makeParams().findElementByIdAcrossRoots(null)).toBeNull();
  });

  it('prefers local root over document', () => {
    const localEl = document.createElement('div');
    localEl.id = 'shared-id';
    const localRoot = { getElementById: jest.fn().mockReturnValue(localEl) };
    const b = makeParams({ element: { getRootNode: () => localRoot } });
    expect(b.findElementByIdAcrossRoots('shared-id')).toBe(localEl);
    expect(localRoot.getElementById).toHaveBeenCalledWith('shared-id');
  });

  it('falls back to document.getElementById', () => {
    const docEl = document.createElement('div');
    docEl.id = 'doc-target';
    document.body.appendChild(docEl);
    try {
      const b = makeParams({ element: { getRootNode: () => null } });
      expect(b.findElementByIdAcrossRoots('doc-target')).toBe(docEl);
    } finally {
      docEl.remove();
    }
  });
});

describe('ButtonParams.applyValues / emitChoice', () => {
  function setup() {
    const target = document.createElement('input');
    target.id = 'dosage-input';
    document.body.appendChild(target);
    const b = makeParams({
      idvalues: 'dosage-input,500',
      targetid: '',
      group: 'dosage',
      title: '500mg',
      label: '',
    });
    // no targetid -> resolveTargetRoot null, lookup via document
    return { target, b };
  }

  it('sets target value and fires input+change events', () => {
    const { target, b } = setup();
    try {
      const inputSpy = jest.fn();
      const changeSpy = jest.fn();
      target.addEventListener('input', inputSpy);
      target.addEventListener('change', changeSpy);
      const emit = jest.spyOn(b, 'emitChoice');
      b.applyValues();
      expect(target.value).toBe('500');
      expect(inputSpy).toHaveBeenCalled();
      expect(changeSpy).toHaveBeenCalled();
      expect(emit).toHaveBeenCalled();
    } finally {
      target.remove();
    }
  });

  it('skips missing targets then still emits choice', () => {
    const b = makeParams({ idvalues: 'no-such-id,1', group: 'g', title: 't' });
    const dispatch = jest.fn();
    b.element.dispatchEvent = dispatch;
    expect(() => b.applyValues()).not.toThrow();
    expect(dispatch).toHaveBeenCalled();
  });

  it('emitChoice is a no-op without group', () => {
    const b = makeParams({ group: '', title: 't' });
    const dispatch = jest.fn();
    b.element.dispatchEvent = dispatch;
    b.emitChoice();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('emitChoice prefers label over title with scope detail', () => {
    const cases = [
      [{ label: 'lbl', title: 'ttl', expected: 'lbl' }],
      [{ label: '', title: 'ttl', expected: 'ttl' }],
    ];
    for (const [{ label, title, expected }] of cases) {
      const b = makeParams({ group: 'g', label, title, targetid: 'scope1' });
      let evt = null;
      b.element.dispatchEvent = (e) => { evt = e; };
      b.emitChoice();
      expect(evt.detail).toEqual({ group: 'g', label: expected, scope: 'scope1' });
      expect(evt.bubbles).toBe(true);
      expect(evt.composed).toBe(true);
    }
  });

  it('resolveTargetRoot returns null without targetid and shadowRoot when present', () => {
    expect(makeParams({ targetid: '' }).resolveTargetRoot()).toBeNull();
    const inner = document.createElement('div');
    const host = document.createElement('div');
    // jsdom shadowRoot is read-only; define via Object.defineProperty
    Object.defineProperty(host, 'shadowRoot', { value: inner, configurable: true });
    host.id = 'shadow-host';
    document.body.appendChild(host);
    try {
      const b = makeParams({ targetid: 'shadow-host', element: { getRootNode: () => null } });
      expect(b.resolveTargetRoot()).toBe(inner);
    } finally {
      host.remove();
    }
  });
});
