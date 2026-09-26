import { GuidedSlides } from '../src/guidedslides/guided-slides.js';

function makeSlides(overrides = {}) {
  const g = Object.create(GuidedSlides.prototype);
  const el = document.createElement('div');
  // stub dispatchEvent to capture slidechange events
  el._events = [];
  const origDispatch = el.dispatchEvent.bind(el);
  el.dispatchEvent = (e) => { el._events.push(e); return origDispatch(e); };
  Object.assign(g, {
    startindex: 0,
    prevlabel: 'Previous',
    nextlabel: 'Next',
    finishlabel: 'Finish',
    shownav: true,
    showdots: true,
    loop: false,
    slideids: '',
    element: el,
    activeIndex: 0,
    totalSlides: 0,
    idsMode: false,
    slideElements: [],
  }, overrides);
  // silence updateVisibility DOM needs by using plain style objects in tests
  return g;
}

function stubSlides(g, n) {
  g.slideElements = Array.from({ length: n }, () => ({ style: {} }));
  g.totalSlides = n;
  g.activeIndex = 0;
  g.updateVisibility();
}

describe('GuidedSlides.binding coercion', () => {
  it('coerces string bindables', () => {
    const g = makeSlides({ startindex: '2', shownav: 'false', showdots: 'false', loop: 'true' });
    g.binding();
    expect(g.startindex).toBe(2);
    expect(g.shownav).toBe(false);
    expect(g.showdots).toBe(false);
    expect(g.loop).toBe(true);
  });

  it('defaults bad startindex to 0', () => {
    const g = makeSlides({ startindex: 'abc' });
    g.binding();
    expect(g.startindex).toBe(0);
  });
});

describe('GuidedSlides.parseSlideIds / normalizeIndex', () => {
  it('splits and trims ids', () => {
    expect(makeSlides({ slideids: 'a; b;;' }).parseSlideIds()).toEqual(['a', 'b']);
    expect(makeSlides({ slideids: '' }).parseSlideIds()).toEqual([]);
    expect(makeSlides({ slideids: null }).parseSlideIds()).toEqual([]);
  });

  it('clamps out-of-range indices', () => {
    const g = makeSlides();
    g.totalSlides = 3;
    expect(g.normalizeIndex(-1)).toBe(0);
    expect(g.normalizeIndex(5)).toBe(2);
    expect(g.normalizeIndex(1)).toBe(1);
    g.totalSlides = 0;
    expect(g.normalizeIndex(2)).toBe(0);
  });
});

describe('GuidedSlides navigation', () => {
  it('next/prev stop at ends without loop', () => {
    const g = makeSlides();
    stubSlides(g, 3);
    expect(g.canGoPrev()).toBe(false);
    expect(g.canGoNext()).toBe(true);
    g.next();
    expect(g.activeIndex).toBe(1);
    g.next();
    expect(g.activeIndex).toBe(2);
    expect(g.isLastSlide()).toBe(true);
    g.next(); // no-op at end
    expect(g.activeIndex).toBe(2);
    g.prev();
    expect(g.activeIndex).toBe(1);
  });

  it('loop wraps around', () => {
    const g = makeSlides({ loop: true });
    stubSlides(g, 2);
    g.next();
    expect(g.activeIndex).toBe(1);
    g.next();
    expect(g.activeIndex).toBe(0);
    g.prev();
    expect(g.activeIndex).toBe(1);
  });

  it('goTo no-ops when already active', () => {
    const g = makeSlides();
    stubSlides(g, 3);
    const events = g.element._events.length;
    g.goTo(0);
    expect(g.activeIndex).toBe(0);
    expect(g.element._events.length).toBe(events);
    g.goTo(2);
    expect(g.activeIndex).toBe(2);
  });

  it('updateVisibility shows only the active slide', () => {
    const g = makeSlides();
    stubSlides(g, 3);
    g.activeIndex = 1;
    g.updateVisibility();
    expect(g.slideElements.map((s) => s.style.display)).toEqual(['none', '', 'none']);
  });

  it('dispatchSlideChange carries index/total/idsMode', () => {
    const g = makeSlides();
    stubSlides(g, 3);
    g.idsMode = true;
    g.activeIndex = 1;
    g.dispatchSlideChange();
    const evt = g.element._events[g.element._events.length - 1];
    expect(evt.type).toBe('slidechange');
    expect(evt.detail).toEqual({ index: 1, total: 3, idsMode: true });
  });

  it('canGoNext is false with no slides', () => {
    const g = makeSlides();
    g.totalSlides = 0;
    expect(g.canGoNext()).toBe(false);
    expect(g.isLastSlide()).toBe(false);
  });
});
