import { bindable, customElement, resolve } from 'aurelia';

@customElement('dbs-guidedslides')
export class GuidedSlides {
  @bindable startindex = 0;
  @bindable prevlabel = 'Previous';
  @bindable nextlabel = 'Next';
  @bindable finishlabel = 'Finish';
  @bindable shownav = true;
  @bindable showdots = true;
  @bindable loop = false;
  @bindable slideids = '';

  element = resolve(Element);
  activeIndex = 0;
  totalSlides = 0;
  idsMode = false;
  slideElements = [];

  binding() {
    if (typeof this.startindex === 'string') this.startindex = parseInt(this.startindex, 10) || 0;
    if (typeof this.shownav === 'string') this.shownav = this.shownav === 'true';
    if (typeof this.showdots === 'string') this.showdots = this.showdots === 'true';
    if (typeof this.loop === 'string') this.loop = this.loop === 'true';
  }

  attached() {
    this.refreshSlides();
  }

  slideidsChanged() {
    this.refreshSlides();
  }

  refreshSlides() {
    const ids = this.parseSlideIds();
    if (ids.length > 0) {
      this.idsMode = true;
      this.slideElements = this.resolveSlideElements(ids);
    } else {
      this.idsMode = false;
      this.slideElements = this.getSlotSlides();
    }

    this.totalSlides = this.slideElements.length;
    this.activeIndex = this.normalizeIndex(this.startindex);
    this.updateVisibility();
    this.dispatchSlideChange();
  }

  parseSlideIds() {
    if (!this.slideids || typeof this.slideids !== 'string') return [];
    return this.slideids
      .split(';')
      .map(id => id.trim())
      .filter(id => id.length > 0);
  }

  getContextRoot() {
    if (this.element && typeof this.element.getRootNode === 'function') {
      return this.element.getRootNode();
    }
    return document;
  }

  findById(id) {
    const root = this.getContextRoot();
    if (root && typeof root.getElementById === 'function') {
      const local = root.getElementById(id);
      if (local) return local;
    }

    const global = document.getElementById(id);
    if (global) return global;

    return this.findInShadowTree(document, id);
  }

  findInShadowTree(root, id) {
    if (!root || typeof root.querySelectorAll !== 'function') return null;

    const hosts = root.querySelectorAll('*');
    for (const host of hosts) {
      if (!host.shadowRoot) continue;

      const directMatch = host.shadowRoot.getElementById(id);
      if (directMatch) return directMatch;

      const nestedMatch = this.findInShadowTree(host.shadowRoot, id);
      if (nestedMatch) return nestedMatch;
    }

    return null;
  }

  resolveSlideElements(ids) {
    const resolved = [];
    for (const id of ids) {
      const el = this.findById(id);
      if (el) resolved.push(el);
    }
    return resolved;
  }

  getSlotSlides() {
    const root = this.element.shadowRoot || this.element;
    return Array.from(root.querySelectorAll('[data-guided-slide]'));
  }

  normalizeIndex(index) {
    if (this.totalSlides <= 0) return 0;
    if (index < 0) return 0;
    if (index >= this.totalSlides) return this.totalSlides - 1;
    return index;
  }

  updateVisibility() {
    for (let i = 0; i < this.slideElements.length; i++) {
      const slide = this.slideElements[i];
      if (!slide) continue;
      slide.style.display = (i === this.activeIndex) ? '' : 'none';
    }
  }

  canGoPrev() {
    return this.loop || this.activeIndex > 0;
  }

  canGoNext() {
    if (this.totalSlides <= 0) return false;
    return this.loop || this.activeIndex < this.totalSlides - 1;
  }

  get canGoPrevNav() {
    return this.canGoPrev();
  }

  get canGoNextNav() {
    return this.canGoNext();
  }

  get isLastSlideNav() {
    return this.isLastSlide();
  }

  prev() {
    if (!this.canGoPrev()) return;

    if (this.activeIndex <= 0) {
      this.activeIndex = this.totalSlides - 1;
    } else {
      this.activeIndex -= 1;
    }

    this.updateVisibility();
    this.dispatchSlideChange();
  }

  next() {
    if (!this.canGoNext()) return;

    if (this.activeIndex >= this.totalSlides - 1) {
      this.activeIndex = 0;
    } else {
      this.activeIndex += 1;
    }

    this.updateVisibility();
    this.dispatchSlideChange();
  }

  isLastSlide() {
    return this.totalSlides > 0 && this.activeIndex === this.totalSlides - 1;
  }

  goTo(index) {
    const normalized = this.normalizeIndex(index);
    if (normalized === this.activeIndex) return;

    this.activeIndex = normalized;
    this.updateVisibility();
    this.dispatchSlideChange();
  }

  finish() {
    window.location.reload();
  }

  dispatchSlideChange() {
    this.element.dispatchEvent(new CustomEvent('slidechange', {
      bubbles: true,
      composed: true,
      detail: {
        index: this.activeIndex,
        total: this.totalSlides,
        idsMode: this.idsMode
      }
    }));
  }
}
