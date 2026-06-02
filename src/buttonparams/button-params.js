import { bindable, customElement, resolve } from 'aurelia';

@customElement('dbs-buttonparams')
export class ButtonParams {
  @bindable title = 'Apply Parameters';
  @bindable idvalues = '';
  @bindable targetid = '';
  element = resolve(Element);

  findElementByIdAcrossRoots(id) {
    const trimmedId = typeof id === 'string' ? id.trim() : '';
    if (!trimmedId) return null;

    const localRoot = this.element && typeof this.element.getRootNode === 'function'
      ? this.element.getRootNode()
      : null;
    if (localRoot && typeof localRoot.getElementById === 'function') {
      const localMatch = localRoot.getElementById(trimmedId);
      if (localMatch) return localMatch;
    }

    const globalMatch = document.getElementById(trimmedId);
    if (globalMatch) return globalMatch;

    return this.findInShadowTree(document, trimmedId);
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

  resolveTargetRoot() {
    if (!this.targetid || typeof this.targetid !== 'string') return null;

    const host = this.findElementByIdAcrossRoots(this.targetid);
    if (!host) return null;

    return host.shadowRoot || host;
  }

  findTargetElement(id, scopedRoot) {
    const trimmedId = typeof id === 'string' ? id.trim() : '';
    if (!trimmedId) return null;

    if (scopedRoot && typeof scopedRoot.getElementById === 'function') {
      const scopedTarget = scopedRoot.getElementById(trimmedId);
      if (scopedTarget) return scopedTarget;
    }

    return this.findElementByIdAcrossRoots(trimmedId);
  }

  parseIdValues() {
    if (!this.idvalues || typeof this.idvalues !== 'string') return [];

    return this.idvalues
      .split(';')
      .map(part => part.trim())
      .filter(part => part.length > 0)
      .map(part => {
        const parts = part.split(',');
        if (parts.length < 2) return null;

        const id = parts[0].trim();
        const value = parts.slice(1).join(',').trim();
        if (!id) return null;

        return { id, value };
      })
      .filter(entry => entry !== null);
  }

  applyValues() {
    const entries = this.parseIdValues();
    const scopedRoot = this.resolveTargetRoot();

    for (const entry of entries) {
      const target = this.findTargetElement(entry.id, scopedRoot);
      if (!target) continue;

      if ('value' in target) {
        target.value = entry.value;
      }

      target.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      target.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    }
  }
}
