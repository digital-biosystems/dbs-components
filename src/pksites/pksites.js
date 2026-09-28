import { customElement, bindable, resolve } from 'aurelia';
import { PROC, TISSUES, COLORS, MAX, ORGANS, BODY_SCALE, BODY_X, BODY_Y } from './constants.js';
import { search, resolve as resolveDrug, compute, esc, code, cellOf, affectedAt, nameOf, organTier } from './adme-compute.js';
import fallbackSvgText from './anatomogram-text.js';

@customElement('dbs-pksites')
export class Pksites {
  @bindable db = '';
  @bindable anatomogram = '';
  // sql.js loader script — e.g. "assets/sqljs/sql-wasm.js" or CDN URL. WASM is derived via locateFile.
  @bindable sqlWasm = '';
  @bindable drugs = '';
  @bindable max = MAX;
  @bindable showDdi = true;
  @bindable includeText = true;
  @bindable focus = null;

  // internal state
  dbInstance = null;
  SQL = null;
  model = null;
  sel = [];
  hits = [];
  searchTerm = '';
  status = '';
  statusErr = false;
  hintText = '';
  copyHint = '';
  metaText = '';
  bodySvgText = null;
  bodyLoadError = null;
  detailPinned = false;
  detailDrug = null;
  detailTissue = null;

  // tooltip
  tipHtml = '';
  tipVisible = false;
  tipLeft = '0px';
  tipTop = '0px';

  // refs
  heatmapEl;
  bodyEl;
  detailEl;
  ddiEl;
  sharedEl;
  tableEl;
  tipEl;

  element = resolve(Element);

  // static caches so multiple instances on one page share the heavy fetches
  static dbCache = new Map();
  static bodyCache = new Map();
  static sqlPromise = null;

  bound() {
    // normalize booleans that may arrive as strings from HTML attributes
    if (typeof this.showDdi === 'string') this.showDdi = this.showDdi !== 'false' && this.showDdi !== '0';
    if (typeof this.includeText === 'string') this.includeText = this.includeText !== 'false' && this.includeText !== '0';
    if (typeof this.max === 'string') this.max = parseInt(this.max, 10) || MAX;
  }

  async attached() {
    await this.init();
  }

  detached() {
    this.hideTip();
  }

  // ── bindable change hooks ──────────────────────────────────────────────────
  async dbChanged() {
    if (!this.dbInstance) {
      // still booting — attached() will handle it
      return;
    }
    await this.reloadDb();
  }

  drugsChanged() {
    if (!this.dbInstance) return;
    this.initSelFromDrugs();
    this.recomputeAndRender();
  }

  showDdiChanged() { if (this.model) this.renderAll(); }
  includeTextChanged() { if (this.dbInstance) this.recomputeAndRender(); }
  focusChanged() { if (this.model) this.renderAll(); }
  searchTermChanged() { this.onSearch(); }

  anatomogramChanged() {
    this.bodySvgText = null;
    this.loadAnatomogram().then(() => { if (this.model) this.renderAll(); });
  }

  // ── init ────────────────────────────────────────────────────────────────────
  async init() {
    if (!this.db) {
      this.setStatus('Set db="..." to the ADME SQLite file (e.g. db="data/adme-ee9360f546.sqlite" or db="data/adme-latest.json"). The file is linked during deployment and is fetched lazily on demand — nothing is loaded until the component is attached.', false);
      return;
    }
    this.setStatus('Loading the site database…');
    try {
      await this.ensureSqlJs();
      await this.loadDb();
      await this.loadAnatomogram();
      this.initSelFromDrugs();
      this.recomputeAndRender();
      this.setStatus('');
    } catch (e) {
      this.setStatus(String(e.message || e), true);
      console.error('[dbs-pksites]', e);
    }
  }

  async reloadDb() {
    this.setStatus('Loading the site database…');
    try {
      await this.ensureSqlJs();
      await this.loadDb(true);
      this.initSelFromDrugs();
      this.recomputeAndRender();
      this.setStatus('');
    } catch (e) {
      this.setStatus(String(e.message || e), true);
    }
  }

  setStatus(msg, isErr) {
    this.status = msg || '';
    this.statusErr = !!isErr;
  }

  getColor(i) { return COLORS[i % COLORS.length]; }
  getCode(name) { return code(name); }

  // ── sql.js loader ──────────────────────────────────────────────────────────
  async ensureSqlJs() {
    if (this.SQL) return this.SQL;
    if (window.initSqlJs) {
      const base = this.deriveBase(this.sqlWasm);
      this.SQL = await window.initSqlJs({ locateFile: f => base + f });
      return this.SQL;
    }
    if (Pksites.sqlPromise) {
      this.SQL = await Pksites.sqlPromise;
      return this.SQL;
    }
    const candidates = [];
    if (this.sqlWasm) candidates.push(this.sqlWasm);
    candidates.push('assets/sqljs/sql-wasm.js');
    candidates.push('https://sql.js.org/dist/sql-wasm.js');
    // also try CDN via cdnjs
    candidates.push('https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/sql-wasm.js');

    let lastErr = null;
    Pksites.sqlPromise = (async () => {
      for (const url of candidates) {
        let jsUrl = url;
        if (jsUrl.endsWith('.wasm')) jsUrl = jsUrl.replace(/\.wasm$/, '.js');
        try {
          await this.loadScript(jsUrl);
          if (!window.initSqlJs) throw new Error('initSqlJs not found after loading ' + jsUrl);
          const base = this.deriveBase(jsUrl);
          const SQL = await window.initSqlJs({ locateFile: f => base + f });
          return SQL;
        } catch (e) {
          lastErr = e;
        }
      }
      throw lastErr || new Error('could not load sql.js');
    })();
    try {
      this.SQL = await Pksites.sqlPromise;
      return this.SQL;
    } catch (e) {
      Pksites.sqlPromise = null;
      throw e;
    }
  }

  deriveBase(url) {
    if (!url) return 'https://sql.js.org/dist/';
    const i = url.lastIndexOf('/');
    return i >= 0 ? url.slice(0, i + 1) : '';
  }

  loadScript(url) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${url}"]`)) {
        // already present — wait a tick for initSqlJs to appear
        setTimeout(() => window.initSqlJs ? resolve() : reject(new Error('script present but initSqlJs missing: ' + url)), 50);
        return;
      }
      const s = document.createElement('script');
      s.src = url;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('could not load ' + url));
      document.head.appendChild(s);
    });
  }

  // ── DB loading — lazy, supports .sqlite direct or .json meta (like pharmacolibrary) ──
  async loadDb(force = false) {
    const url = (this.db || '').trim();
    if (!url) throw new Error('db attribute is empty');
    if (!force && Pksites.dbCache.has(url) && Pksites.dbCache.get(url).db) {
      const cached = Pksites.dbCache.get(url);
      this.dbInstance = cached.db;
      return;
    }
    if (this.SQL == null) throw new Error('SQL engine not ready');
    let buf;
    if (url.endsWith('.json')) {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`${url} → ${r.status}`);
      const meta = await r.json();
      const file = meta.file;
      if (!file) throw new Error(`meta ${url} missing "file"`);
      const base = url.slice(0, url.lastIndexOf('/') + 1);
      const dbUrl = file.includes('/') || file.startsWith('http') ? file : base + file;
      // allow absolute or relative
      const finalUrl = file.startsWith('http') ? file : (dbUrl.startsWith('http') ? dbUrl : dbUrl);
      const r2 = await fetch(finalUrl);
      if (!r2.ok) throw new Error(`${finalUrl} → ${r2.status}`);
      buf = await r2.arrayBuffer();
    } else {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`${url} → ${r.status}`);
      buf = await r.arrayBuffer();
    }
    this.dbInstance = new this.SQL.Database(new Uint8Array(buf));
    Pksites.dbCache.set(url, { db: this.dbInstance });
  }

  async loadAnatomogram() {
    let url = (this.anatomogram || '').trim();
    if (!url) {
      // bundled fallback — no fetch, already in the JS bundle (~130 KB)
      this.bodySvgText = fallbackSvgText;
      return;
    }
    if (Pksites.bodyCache.has(url)) {
      this.bodySvgText = Pksites.bodyCache.get(url);
      return;
    }
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`anatomogram ${r.status}`);
      const t = await r.text();
      this.bodySvgText = t;
      Pksites.bodyCache.set(url, t);
    } catch (e) {
      this.bodyLoadError = e.message;
      // fall back to bundled drawing so the component still renders
      this.bodySvgText = fallbackSvgText;
    }
  }

  // ── drug selection ──────────────────────────────────────────────────────────
  initSelFromDrugs() {
    if (!this.dbInstance) return;
    const raw = (this.drugs || '').trim();
    if (!raw) {
      this.sel = [];
      return;
    }
    const slugs = raw.split(',').map(s => s.trim()).filter(Boolean).slice(0, this.max);
    this.sel = resolveDrug(this.dbInstance, slugs);
    // keep focus valid
    if (this.focus && !this.sel.some(d => d.slug === this.focus)) this.focus = null;
  }

  addDrug(slug) {
    if (!this.dbInstance) return;
    if (this.sel.length >= this.max) {
      this.hintText = `at most ${this.max} drugs`;
      setTimeout(() => { this.hintText = ''; }, 2000);
      return;
    }
    if (this.sel.some(d => d.slug === slug)) return;
    const r = resolveDrug(this.dbInstance, [slug]);
    if (!r.length) return;
    this.sel = [...this.sel, r[0]];
    this.searchTerm = '';
    this.hits = [];
    this.emitDrugsChange();
    this.recomputeAndRender();
  }

  removeDrug(slug) {
    this.sel = this.sel.filter(d => d.slug !== slug);
    if (this.focus === slug) this.focus = null;
    this.emitDrugsChange();
    this.recomputeAndRender();
  }

  removeDrugAndStop(slug, ev) {
    if (ev) ev.stopPropagation();
    this.removeDrug(slug);
  }

  toggleFocus(slug) {
    this.focus = this.focus === slug ? null : slug;
    this.renderAll();
    this.emitDrugsChange();
  }

  emitDrugsChange() {
    const detail = { drugs: this.sel.map(d => d.slug), focus: this.focus };
    this.element.dispatchEvent(new CustomEvent('change', { bubbles: true, composed: true, detail }));
    this.element.dispatchEvent(new CustomEvent('dbs-pksites-change', { bubbles: true, composed: true, detail }));
  }

  onSearch() {
    if (!this.dbInstance) { this.hits = []; return; }
    const term = (this.searchTerm || '').trim();
    if (term.length < 2) { this.hits = []; return; }
    try {
      this.hits = search(this.dbInstance, term);
    } catch {
      this.hits = [];
    }
  }

  copyLink() {
    const base = location.hash ? location.hash.split('?')[0] : '#/sites';
    // emit has no hash in generic use — just copy drugs list
    const drugsParam = this.sel.map(d => d.slug).join(',');
    const url = drugsParam ? `${location.href.split('?')[0].split('#')[0]}#${base}?drugs=${encodeURIComponent(drugsParam)}` : location.href;
    const plain = this.sel.map(d => d.slug).join(',');
    const toCopy = url.includes('drugs=') ? url : plain;
    const done = () => {
      this.copyHint = 'copied';
      setTimeout(() => { this.copyHint = ''; }, 1800);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(toCopy).then(done, () => { this.hintText = toCopy; });
    } else {
      this.hintText = toCopy;
    }
  }

  clearPin() {
    this.detailPinned = false;
    this.renderAll();
  }

  // ── compute & render ───────────────────────────────────────────────────────
  recomputeAndRender() {
    if (!this.dbInstance) return;
    this.model = compute(this.dbInstance, this.sel, { text: this.includeText !== false });
    this.metaText = `${this.model.rows.length} site row(s), ${this.model.affected.length} affected-site row(s)`;
    // keep detail selection valid
    if (!this.detailPinned) {
      this.detailDrug = this.focus || (this.sel[0] ? this.sel[0].slug : null);
      this.detailTissue = null;
    }
    this.renderAll();
  }

  renderAll() {
    // defer one microtask so refs are bound after Aurelia's DOM update
    queueMicrotask(() => {
      this.renderHeatmap();
      this.renderDdi();
      this.renderBody();
      this.renderShared();
      this.renderTable();
      // detail is rendered from within renderBody via onOrgan, but also ensure initial
      if (this.detailEl && this.model && this.sel.length && !this.detailPinned) {
        const slug = this.detailDrug || this.focus || this.sel[0].slug;
        this.renderDetail(slug, this.detailTissue, false);
      }
    });
  }

  // ── tooltip ─────────────────────────────────────────────────────────────────
  showTip(html, ev) {
    if (!html) { this.hideTip(); return; }
    this.tipHtml = html;
    this.tipVisible = true;
    const x = Math.min(ev.clientX + 14, window.innerWidth - 330);
    const y = ev.clientY + 14;
    this.tipLeft = x + 'px';
    this.tipTop = y + 'px';
  }
  hideTip() {
    this.tipVisible = false;
    this.tipHtml = '';
  }
  tipText(name, proc, tissue, rs, aff) {
    let acts = [];
    const seen = {};
    rs.forEach(r => { if (r.actor) { const k = r.actor + ' (' + r.role + ')'; if (!seen[k]) { seen[k] = 1; acts.push(k); } } });
    acts.sort();
    const quote = rs.filter(r => !r.actor && r.quote).map(r => r.quote)[0];
    let s = '<b>' + esc(name) + ' · ' + esc(proc) + ' · ' + esc(tissue) + '</b>';
    if (acts.length) s += '<br>' + acts.map(esc).join('<br>');
    if (quote) s += (acts.length ? '<br>' : '') + '<small>…' + esc(quote.slice(0, 100)) + '…</small>';
    if (!acts.length && !quote) s += '<br><small>no site evidence</small>';
    if (aff.length) s += '<br><small>affected: ' + aff.map(a => esc(a.perpetrator + ' ' + a.effect + ' ' + a.actor)).join('; ') + '</small>';
    return s;
  }

  // ── heatmap ─────────────────────────────────────────────────────────────────
  renderHeatmap() {
    const root = this.heatmapEl;
    if (!root) return;
    const M = this.model;
    if (!M) { root.innerHTML = ''; return; }
    const focus = this.focus;
    const showDDI = this.showDdi !== false;
    const cols = [];
    PROC.forEach(p => {
      TISSUES.forEach(t => {
        if (M.drugs.some(d => cellOf(M, d.slug, p, t).w)) cols.push([p, t]);
      });
    });

    if (!cols.length) { root.innerHTML = '<p class="pks-empty">No site evidence for this set — pick drugs with a DrugBank id.</p>'; return; }
    let h = '<table class="pks-hm"><tr><th></th>';
    let i = 0;
    while (i < cols.length) {
      let j = i;
      while (j < cols.length && cols[j][0] === cols[i][0]) j++;
      h += '<th class="proc" colspan="' + (j - i) + '">' + esc(cols[i][0]) + '</th>' + (j < cols.length ? '<th class="gap"></th>' : '');
      i = j;
    }
    h += '</tr><tr><th></th>';
    cols.forEach((c, k) => { h += '<th class="tissue"><span>' + esc(c[1]) + '</span></th>' + (k + 1 < cols.length && cols[k + 1][0] !== c[0] ? '<th class="gap"></th>' : ''); });
    h += '</tr>';
    M.drugs.forEach((d, di) => {
      h += '<tr' + (focus && focus !== d.slug ? ' class="dim"' : '') + '><th class="drug"><i style="background:' + COLORS[di] + '"></i>' + esc(d.name) + (showDDI ? this.partnerCodes(M, d.slug) : '') + '</th>';
      cols.forEach((c, k) => {
        const cl = cellOf(M, d.slug, c[0], c[1]);
        const aff = showDDI ? affectedAt(M, d.slug, c[0], c[1]) : [];
        h += '<td class="e' + cl.w + (aff.length ? ' aff' : '') + '" tabindex="0" data-d="' + esc(d.slug) + '" data-p="' + esc(c[0]) + '" data-t="' + esc(c[1]) + '" aria-label="' + esc(d.name + ' ' + c[0] + ' ' + c[1] + ' tier ' + cl.w) + '">' + this.perpDots(M, aff) + '</td>';
        if (k + 1 < cols.length && cols[k + 1][0] !== c[0]) h += '<td class="gap"></td>';
      });
      h += '</tr>';
    });
    root.innerHTML = '<div class="pks-scroll"><table class="pks-hm">' + h + '</table></div>';
    root.querySelectorAll('td[data-d]').forEach(td => {
      const html = this.tipText(nameOf(M, td.dataset.d), td.dataset.p, td.dataset.t, cellOf(M, td.dataset.d, td.dataset.p, td.dataset.t).rows, showDDI ? affectedAt(M, td.dataset.d, td.dataset.p, td.dataset.t) : []);
      td.onmouseenter = e => this.showTip(html, e);
      td.onmousemove = e => this.showTip(html, e);
      td.onmouseleave = () => this.hideTip();
      td.onfocus = () => { const r = td.getBoundingClientRect(); this.showTip(html, { clientX: r.left, clientY: r.bottom }); };
      td.onblur = () => this.hideTip();
    });
  }

  // helpers for heatmap row labels
  codePill(M, slug) {
    const i = M.drugs.map(z => z.slug).indexOf(slug);
    return '<span class="pks-code" title="' + esc(nameOf(M, slug)) + '"><i style="background:' + COLORS[i] + '"></i>' + esc(code(nameOf(M, slug))) + '</span>';
  }
  perpDots(M, aff) {
    if (!aff.length) return '';
    const slugs = M.drugs.map(z => z.slug);
    const seen = {}, dots = [];
    aff.forEach(a => {
      const k = a.perpetrator + (a.effect.indexOf('inducer') >= 0 ? '|ind' : '|inh');
      if (seen[k]) return; seen[k] = 1;
      const col = COLORS[slugs.indexOf(a.perpetrator)];
      dots.push('<i class="' + (a.effect.indexOf('inducer') >= 0 ? 'ind' : 'inh') + '" style="' + (a.effect.indexOf('inducer') >= 0 ? 'border-color:' : 'background:') + col + '" title="' + esc(nameOf(M, a.perpetrator) + ' ' + a.effect + ' ' + a.actor) + '"></i>');
    });
    return '<span class="pks-dots">' + dots.join('') + '</span>';
  }
  partnerCodes(M, slug) {
    const perps = [], victs = [];
    M.affected.forEach(a => {
      if (a.victim === slug && perps.indexOf(a.perpetrator) < 0) perps.push(a.perpetrator);
      if (a.perpetrator === slug && victs.indexOf(a.victim) < 0) victs.push(a.victim);
    });
    let h = '';
    if (perps.length) h += ' <span class="pks-partners" title="affected by">⇠ ' + perps.map(p => this.codePill(M, p)).join('') + '</span>';
    if (victs.length) h += ' <span class="pks-partners" title="affects">⇢ ' + victs.map(v => this.codePill(M, v)).join('') + '</span>';
    return h;
  }

  // ── anatomogram ─────────────────────────────────────────────────────────────
  renderBody() {
    const root = this.bodyEl;
    if (!root) return;
    const M = this.model;
    if (!M) { root.innerHTML = ''; return; }
    if (!this.bodySvgText) {
      root.innerHTML = this.bodyLoadError ? '<p class="pks-empty">The body drawing could not be loaded (' + esc(this.bodyLoadError) + ').</p>' : '<p class="pks-empty">Loading body drawing…</p>';
      return;
    }
    this.drawBody(root, M, { focus: this.focus, ddi: this.showDdi !== false });
  }

  drawBody(root, M, opts) {
    const focus = opts.focus, showDDI = opts.ddi !== false;
    const n = M.drugs.length;
    const step = n > 5 ? 15 : 19, wid = n > 5 ? 13 : 17, ROW = 36;
    const W = 640, H = 620, LEFT_EDGE = 150, RIGHT_EDGE = 494;
    const rows = [];
    ORGANS.forEach(o => {
      if (!M.drugs.some(d => organTier(M, d.slug, o.t))) return;
      rows.push({ o, ay: by(o.ay), y: by(o.ay) });
    });
    ['L', 'R'].forEach(side => {
      const rs = rows.filter(r => r.o.side === side).sort((a, b) => a.ay - b.ay);
      let yMin = 26;
      rs.forEach(r => { r.y = Math.max(r.ay, yMin); yMin = r.y + ROW; });
      const over = rs.length ? rs[rs.length - 1].y + 16 - H : 0;
      if (over > 0) rs.forEach(r => { r.y -= over; });
    });
    const organState = {};
    const slots = [], labels = [], leaders = [], arrows = [];
    rows.forEach(r => {
      const o = r.o, left = o.side === 'L';
      const x0 = left ? LEFT_EDGE - n * step : RIGHT_EDGE, y = r.y;
      const st = organState[o.id] = organState[o.id] || { w: 0, aff: [] };
      labels.push('<text class="lbl" x="' + (left ? LEFT_EDGE - 2 : RIGHT_EDGE) + '" y="' + (y - 4) + '"' + (left ? ' text-anchor="end"' : '') + '>' + esc(o.label) + '</text>');
      leaders.push('<path class="lead" d="M' + (left ? LEFT_EDGE + 2 : RIGHT_EDGE - 2) + ',' + (y + 7) + ' L' + bx(o.ax) + ',' + by(o.ay) + '"/>');
      M.drugs.forEach((d, i) => {
        const w = organTier(M, d.slug, o.t), aff = showDDI ? affectedAt(M, d.slug, null, o.t) : [];
        if (!o.proxy) { st.w = Math.max(st.w, w); aff.forEach(a => { if (st.aff.indexOf(a.perpetrator) < 0) st.aff.push(a.perpetrator); }); }
        const x = x0 + i * step, dim = focus && focus !== d.slug ? ' dim' : '';
        slots.push('<g class="slotg" data-d="' + esc(d.slug) + '" data-t="' + esc(o.t) + '"><rect class="slot e' + w + dim + '" x="' + x + '" y="' + y + '" width="' + wid + '" height="14" rx="3"/>' +
          (aff.length ? '<rect class="aff" x="' + (x - 2) + '" y="' + (y - 2) + '" width="' + (wid + 4) + '" height="18" rx="4"/>' : '') +
          '<text x="' + (x + wid / 2) + '" y="' + (y + 10.5) + '" text-anchor="middle" class="cd' + (w >= 2 ? ' on' : '') + '">' + esc(n > 5 ? code(nameOf(M, d.slug))[0] : code(nameOf(M, d.slug))) + '</text></g>');
        if (showDDI && focus && aff.length && (focus === d.slug || aff.some(a => a.perpetrator === focus))) {
          aff.forEach(a => {
            if (focus !== d.slug && focus !== a.perpetrator) return;
            const pi = M.drugs.map(z => z.slug).indexOf(a.perpetrator);
            if (pi < 0 || pi === i) return;
            const px = x0 + pi * step + wid / 2, vx = x + wid / 2, top = y - 14;
            arrows.push('<path class="arrow" style="stroke:' + COLORS[pi] + '" d="M' + px + ',' + (y - 3) + ' C' + px + ',' + top + ' ' + vx + ',' + top + ' ' + vx + ',' + (y - 3) + '"/>');
          });
        }
      });
    });
    const slugs = M.drugs.map(z => z.slug);
    root.innerHTML = '<svg class="pks-body" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="female body with the ADME organs of this drug set">' +
      '<defs><marker id="pks-ah" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="context-stroke"/></marker></defs>' +
      '<g class="anat" transform="translate(' + BODY_X + ',' + BODY_Y + ') scale(' + BODY_SCALE + ')">' + bodyInner(this.bodySvgText) + '</g>' +
      leaders.join('') + labels.join('') + slots.join('') + arrows.join('') +
      '<a href="https://github.com/ebi-gene-expression-group/anatomogram" target="_blank" rel="noopener"><text class="credit" x="' + (W - 4) + '" y="' + (H - 6) + '" text-anchor="end">body: EMBL-EBI Expression Atlas anatomogram, CC BY 4.0</text></a>' +
      '</svg>';
    const svg = root.querySelector('svg.pks-body');
    ORGANS.forEach(o => {
      if (o.proxy) return;
      const el = svg.querySelector('#' + o.id); if (!el) return;
      const st = organState[o.id] || { w: 0, aff: [] };
      el.classList.add('organ', 'e' + st.w);
      if (o.whole && !st.w) el.classList.add('hidden');
      const ramp = (o.t === 'kidney' || o.t === 'blood') ? '--pks-kid' : '--pks-ev';
      el.style.fill = st.w ? 'var(' + ramp + st.w + ')' : (o.whole ? 'none' : 'var(--pks-organ)');
      el.style.fillOpacity = st.w ? '.55' : '.4';
      if (st.aff.length) {
        const col = st.aff.length === 1 ? COLORS[slugs.indexOf(st.aff[0])] : 'var(--pks-warn)';
        el.style.stroke = col; el.style.strokeWidth = '0.7'; el.style.strokeDasharray = '1.4 0.9'; el.style.strokeLinejoin = 'round';
        el.style.fillOpacity = '.65';
      } else if (st.w) {
        el.style.stroke = '#fff'; el.style.strokeWidth = '0.35'; el.style.strokeDasharray = 'none';
      } else { el.style.stroke = 'none'; }
      if (focus && st.w) el.style.opacity = M.drugs.some(d => d.slug === focus && organTier(M, focus, o.t)) ? '1' : '.45';
      const tissues = ORGANS.filter(z => z.id === o.id).map(z => z.t);
      el.addEventListener('mouseenter', e => { this.organTip(M, tissues, e, showDDI); if (!this.detailPinned) { const d = this.firstDrugAt(M, tissues, focus); if (d) this.renderDetail(d, o.t, false); } });
      el.addEventListener('mousemove', e => this.organTip(M, tissues, e, showDDI));
      el.addEventListener('mouseleave', () => this.hideTip());
      el.addEventListener('click', () => { const d = this.firstDrugAt(M, tissues, focus); if (d) this.renderDetail(d, o.t, true); });
    });
    root.querySelectorAll('.slotg').forEach(g => {
      const d = g.dataset.d, t = g.dataset.t;
      const rs = M.rows.filter(r => r.drug === d && r.tissue === t);
      const procs = []; rs.forEach(r => { if (procs.indexOf(r.process) < 0) procs.push(r.process); });
      const html = this.tipText(nameOf(M, d), procs.join('/') || '—', t, rs, showDDI ? affectedAt(M, d, null, t) : []);
      g.onmouseenter = e => { this.showTip(html, e); if (!this.detailPinned) this.renderDetail(d, t, false); };
      g.onmousemove = e => this.showTip(html, e);
      g.onmouseleave = () => this.hideTip();
      g.onclick = () => this.renderDetail(d, t, true);
    });
  }

  firstDrugAt(M, tissues, focus) {
    if (focus && tissues.some(t => organTier(M, focus, t))) return focus;
    const d = M.drugs.filter(z => tissues.some(t => organTier(M, z.slug, t)))[0];
    return d ? d.slug : null;
  }

  organTip(M, tissues, ev, showDDI) {
    const lines = [];
    tissues.forEach(t => {
      M.drugs.forEach(d => {
        const rs = M.rows.filter(r => r.drug === d.slug && r.tissue === t);
        if (!rs.length) return;
        const acts = [], seen = {};
        rs.forEach(r => { if (r.actor) { const k = r.actor + ' (' + r.role + ')'; if (!seen[k]) { seen[k] = 1; acts.push(k); } } });
        const aff = showDDI ? affectedAt(M, d.slug, null, t) : [];
        lines.push('<b>' + esc(d.name) + '</b> · ' + esc(t) + ': ' + (acts.length ? esc(acts.join(', ')) : '<i>prose only</i>') +
          (aff.length ? ' <span class="warn">⇠ ' + esc(aff.map(a => nameOf(M, a.perpetrator)).filter((v, i, arr) => arr.indexOf(v) === i).join(', ')) + '</span>' : ''));
      });
    });
    this.showTip(lines.join('<br>') || '<i>no evidence here</i>', ev);
  }

  // ── detail ──────────────────────────────────────────────────────────────────
  renderDetail(slug, tissue, pinned) {
    if (!this.detailEl) return;
    if (pinned) this.detailPinned = true;
    this.detailDrug = slug;
    this.detailTissue = tissue;
    const M = this.model;
    if (!M) { this.detailEl.innerHTML = ''; return; }
    const rs = M.rows.filter(r => r.drug === slug && (!tissue || r.tissue === tissue));
    const acts = {};
    rs.forEach(r => { if (!r.actor) return; const v = acts[r.actor] = acts[r.actor] || { roles: {}, tissues: {}, process: r.process }; v.roles[r.role] = 1; if (r.tissue) v.tissues[r.tissue] = 1; });
    const aff = M.affected.filter(a => a.victim === slug && (!tissue || a.tissue === tissue));
    let h = '<h4>' + esc(nameOf(M, slug)) + (tissue ? ' · ' + esc(tissue) : '') + (pinned ? ' <span class="pks-meta">pinned — double-click to release</span>' : '') + '</h4>';
    const keys = Object.keys(acts).sort();
    h += keys.length ? '<table class="pks-detail"><tr><th>actor</th><th>role</th><th>process</th><th>tissues</th></tr>' + keys.map(a => {
      const v = acts[a];
      return '<tr><td class="mono">' + esc(a) + '</td><td>' + Object.keys(v.roles).map(r => '<span class="pks-role ' + esc(r) + '">' + esc(r) + '</span>').join('') + '</td><td>' + esc(v.process) + '</td><td>' + esc(Object.keys(v.tissues).join(', ') || 'not in the tissue table') + '</td></tr>';
    }).join('') + '</table>' : '<p class="pks-meta">no curated actor here</p>';
    if (aff.length) h += '<h4 class="warn">can be affected</h4><table class="pks-detail">' + aff.map(a => '<tr><td><b>' + esc(nameOf(M, a.perpetrator)) + '</b> ' + esc(a.effect) + 's <span class="mono">' + esc(a.actor) + '</span></td><td>' + esc(a.process || '') + ' · ' + esc(a.tissue || 'site unmapped') + '</td></tr>').join('') + '</table>';
    this.detailEl.innerHTML = h;
  }

  // ── DDI matrix ──────────────────────────────────────────────────────────────
  renderDdi() {
    const root = this.ddiEl;
    if (!root) return;
    const M = this.model;
    if (!M) { root.innerHTML = ''; return; }
    const focus = this.focus, showDDI = this.showDdi !== false;
    if (!showDDI) { root.innerHTML = '<p class="pks-empty">co-administration layer is off.</p>'; return; }
    if (!M.affected.length) { root.innerHTML = '<p class="pks-empty">No perpetrator → victim pair in this set: no drug here inhibits or induces an actor another one is a substrate of.</p>'; return; }
    const cell = {};
    M.affected.forEach(a => {
      const k = a.perpetrator + '|' + a.victim, c = cell[k] = cell[k] || {};
      const v = c[a.actor] = c[a.actor] || { effect: a.effect, tissues: [], process: a.process };
      if (a.tissue && v.tissues.indexOf(a.tissue) < 0) v.tissues.push(a.tissue);
    });
    let h = '<table class="pks-ddi"><tr><th class="corner"><span>perpetrator ↓ · victim →</span></th>';
    M.drugs.forEach((d, i) => { h += '<th class="victim' + (focus && focus !== d.slug ? ' dim' : '') + '"><i style="background:' + COLORS[i] + '"></i>' + esc(d.name) + '</th>'; });
    h += '</tr>';
    M.drugs.forEach((p, i) => {
      h += '<tr' + (focus && focus !== p.slug ? ' class="dim"' : '') + '><th class="perp"><i style="background:' + COLORS[i] + '"></i>' + esc(p.name) + '</th>';
      M.drugs.forEach(v => {
        if (v.slug === p.slug) { h += '<td class="self"></td>'; return; }
        const c = cell[p.slug + '|' + v.slug];
        if (!c) { h += '<td class="none' + (focus && focus !== v.slug && focus !== p.slug ? ' dim' : '') + '"></td>'; return; }
        const acts = Object.keys(c).sort().map(g => {
          const x = c[g], glyph = x.effect.indexOf('inducer') >= 0 ? (x.effect.indexOf('inhibitor') >= 0 ? '⊣↑' : '↑') : '⊣';
          return '<span class="pks-act" title="' + esc(p.name + ' ' + x.effect + ' ' + g + ' → ' + v.name + ' (substrate)' + (x.process ? ' · ' + x.process : '') + ' · ' + (x.tissues.length ? x.tissues.join(', ') : 'site unmapped')) + '"><span class="mono">' + esc(g) + '</span> ' + glyph + '</span>';
        });
        h += '<td class="hit' + (focus && focus !== v.slug && focus !== p.slug ? ' dim' : '') + '">' + acts.join('<br>') + '</td>';
      });
      h += '</tr>';
    });
    root.innerHTML = '<div class="pks-scroll">' + h + '</table></div><p class="pks-meta">⊣ inhibits the actor · ↑ induces it; the column drug is that actor’s substrate. Hover a cell for the tissue.</p>';
  }

  // ── shared actors ───────────────────────────────────────────────────────────
  renderShared() {
    const root = this.sharedEl;
    if (!root) return;
    const M = this.model;
    if (!M) { root.innerHTML = ''; return; }
    const order = { ddi_candidate: 0, shared_substrate: 1, shared: 2 };
    const list = M.shared.slice().sort((a, b) => (order[a.kind] - order[b.kind]) || a.actor.localeCompare(b.actor));
    if (!list.length) { root.innerHTML = '<p class="pks-empty">These drugs share no curated actor.</p>'; return; }
    const slugs = M.drugs.map(d => d.slug);
    root.innerHTML = list.map(s => {
      const ia = slugs.indexOf(s.a), ib = slugs.indexOf(s.b);
      const kind = { ddi_candidate: '<b class="warn">DDI candidate</b>', shared_substrate: 'shared substrate (competition)', shared: 'shared target / binding' }[s.kind];
      return '<div class="pks-row"><div class="who"><i style="background:' + COLORS[ia] + '"></i>' + esc(nameOf(M, s.a)) + ' <span class="pks-meta">' + esc(s.roles_a.join('/')) + '</span><br><i style="background:' + COLORS[ib] + '"></i>' + esc(nameOf(M, s.b)) + ' <span class="pks-meta">' + esc(s.roles_b.join('/')) + '</span></div><div><span class="mono">' + esc(s.actor) + '</span> — ' + kind + '<br><span class="pks-meta">' + esc(s.process || 'role unmapped') + ' · ' + esc(s.tissues.length ? s.tissues.join(', ') : 'tissue not in the hand table') + '</span></div></div>';
    }).join('');
  }

  // ── table view ──────────────────────────────────────────────────────────────
  renderTable() {
    const root = this.tableEl;
    if (!root) return;
    const M = this.model;
    if (!M) { root.innerHTML = ''; return; }
    root.innerHTML = '<table class="pks-tbl"><tr><th>drug</th><th>process</th><th>tissue</th><th>actor</th><th>role</th><th>evidence</th></tr>' +
      M.rows.map(r => {
        const actor = r.actor ? '<span class="mono">' + esc(r.actor) + '</span>'
          : (r.quote ? '<span class="pks-quote" title="' + esc(r.quote) + '">“' + esc(r.quote) + '”</span>' : '');
        return '<tr><td>' + esc(nameOf(M, r.drug)) + '</td><td>' + esc(r.process) + '</td><td>' + esc(r.tissue || '—') + '</td><td>' + actor + '</td><td>' + esc(r.role || '') + '</td><td>' + this.evidenceCell(r) + '</td></tr>';
      }).join('') + '</table>';
  }

  evidenceCell(r) {
    if (r.evidence === 'paper_pgx') {
      let h = 'paper PGx';
      if (r.source) h += ' · ' + (r.page ? '<a href="#/' + esc(r.page.replace(/\.md$/, '')) + '" title="the record on this site">' + esc(r.source) + '</a>' : esc(r.source));
      if (r.doi) h += ' <a class="pks-doi" href="https://doi.org/' + esc(r.doi) + '" target="_blank" rel="noopener" title="' + esc(r.doi) + '">doi</a>';
      return h;
    }
    if (r.evidence === 'drugbank_actor') return 'DrugBank actor';
    if (r.evidence === 'drugbank_text') return 'DrugBank ADME prose';
    return esc(r.evidence);
  }
}

function bodyInner(text) {
  const m = /<svg\b[^>]*>([\s\S]*)<\/svg>/i.exec(text);
  return m ? m[1] : text;
}
function bx(x) { return BODY_X + x * BODY_SCALE; }
function by(y) { return BODY_Y + y * BODY_SCALE; }
