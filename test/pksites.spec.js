import { search, resolve, compute, esc, code, cellOf, affectedAt } from '../src/pksites/adme-compute.js';
import { Pksites } from '../src/pksites/pksites.js';
import { createFixture } from '@aurelia/testing';
import { CustomElement } from 'aurelia';

// Minimal mock for sql.js Database — implements prepare/bind/step/getAsObject/free
function mockDb(tables) {
  return {
    prepare(sql) {
      let rows = [];
      let idx = -1;
      const lower = sql.toLowerCase();
      return {
        bind(params) {
          if (lower.includes('from adme_drug') && lower.includes('like')) {
            // search — params[0] is like term%
            const term = (params[0] || '').replace(/%/g, '').toLowerCase();
            rows = (tables.adme_drug || []).filter(r => r.generic_name.toLowerCase().startsWith(term)).map(r => ({ slug: r.slug, name: r.generic_name, has_records: r.has_records, via: '' }));
            // also synonym union — params[1] same term, return synonyms matching
            const synRows = (tables.adme_synonym || []).filter(s => s.name.toLowerCase().startsWith(term)).map(s => {
              const d = (tables.adme_drug || []).find(x => x.slug === s.drug_slug);
              return d ? { slug: d.slug, name: d.generic_name, has_records: d.has_records, via: s.name } : null;
            }).filter(Boolean);
            rows = [...rows, ...synRows].sort((a,b) => a.name.localeCompare(b.name)).slice(0,12);
          } else if (lower.includes('from adme_drug where slug')) {
            const slug = params[0];
            const name = params[1];
            const r = (tables.adme_drug || []).find(x => x.slug === slug || x.generic_name === name);
            rows = r ? [{ slug: r.slug, name: r.generic_name, drugbank_id: r.drugbank_id, has_records: r.has_records }] : [];
          } else if (lower.includes('from adme_site')) {
            rows = tables.adme_site || [];
          } else if (lower.includes('from adme_actor where drug_slug')) {
            rows = (tables.adme_actor || []).filter(r => r.drug_slug === params[0]);
          } else if (lower.includes('from adme_text where drug_slug')) {
            rows = (tables.adme_text || []).filter(r => r.drug_slug === params[0]);
          } else {
            rows = [];
          }
          idx = -1;
        },
        step() { idx++; return idx < rows.length; },
        getAsObject() { return rows[idx]; },
        free() {}
      };
    }
  };
}

const tables = {
    adme_drug: [
      { slug: 'tolvaptan', generic_name: 'Tolvaptan', has_records: 1, drugbank_id: 'DB01295' },
      { slug: 'telmisartan', generic_name: 'Telmisartan', has_records: 1, drugbank_id: 'DB00966' },
    ],
    adme_synonym: [
      { drug_slug: 'tolvaptan', name: 'Samsca' },
    ],
    adme_site: [
      { gene: 'CYP3A4', process: 'metabolism', tissue: 'liver', uberon: 'UBERON_0002107', cell: 'hepatocyte' },
      { gene: 'CYP3A4', process: 'metabolism', tissue: 'small intestine', uberon: 'UBERON_0002108', cell: 'enterocyte' },
      { gene: 'ABCB1', process: 'distribution', tissue: 'small intestine', uberon: 'UBERON_0002108', cell: 'enterocyte' },
    ],
    adme_actor: [
      { drug_slug: 'tolvaptan', gene: 'CYP3A4', kind: 'enzyme', role: 'substrate', evidence: 'drugbank_actor', source: null, page: null, doi: null },
      { drug_slug: 'telmisartan', gene: 'CYP3A4', kind: 'enzyme', role: 'inhibitor', evidence: 'drugbank_actor', source: null, page: null, doi: null },
      { drug_slug: 'tolvaptan', gene: 'ABCB1', kind: 'transporter', role: 'substrate', evidence: 'drugbank_actor', source: null, page: null, doi: null },
      { drug_slug: 'telmisartan', gene: 'ABCB1', kind: 'transporter', role: 'substrate', evidence: 'drugbank_actor', source: null, page: null, doi: null },
    ],
    adme_text: [
      { drug_slug: 'tolvaptan', process: 'metabolism', tissue: 'kidney', uberon: null, quote: 'eliminated in kidney' },
    ]
  };

describe('adme-compute', () => {
  it('esc and code helpers', () => {
    expect(esc('a & b')).toBe('a &amp; b');
    expect(code('Tolvaptan')).toBe('To');
    expect(code('Blood Brain Barrier')).toBe('Bb');
  });

  it('search matches generic and synonym', () => {
    const db = mockDb(tables);
    const hits = search(db, 'Tol');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].name).toBe('Tolvaptan');
    const hits2 = search(db, 'Sam');
    expect(hits2.some(h => h.slug === 'tolvaptan')).toBe(true);
  });

  it('resolve by slug and by name', () => {
    const db = mockDb(tables);
    const r = resolve(db, ['tolvaptan', 'Telmisartan']);
    expect(r.length).toBe(2);
    expect(r[0].slug).toBe('tolvaptan');
  });

  it('compute builds rows, shared and affected', () => {
    const db = mockDb(tables);
    const drugs = resolve(db, ['tolvaptan', 'telmisartan']);
    const M = compute(db, drugs, { text: true });
    // tolvaptan: CYP3A4 substrate at liver+small intestine (2), ABCB1 substrate at small intestine (1), plus text kidney (1) => 4 rows
    // telmisartan: CYP3A4 inhibitor at 2 tissues (2), ABCB1 substrate at 1 => 3 rows, total 7? Actually compute counts each tissue separately
    expect(M.rows.length).toBe(7); // 3 + 1 text =4 for tolvaptan, 3 for telmisartan
    expect(M.shared.length).toBe(2); // CYP3A4 ddi_candidate, ABCB1 shared_substrate
    const cyp = M.shared.find(s => s.actor === 'CYP3A4');
    expect(cyp.kind).toBe('ddi_candidate');
    const abcb = M.shared.find(s => s.actor === 'ABCB1');
    expect(abcb.kind).toBe('shared_substrate');
    expect(M.affected.length).toBeGreaterThan(0);
    const aff = M.affected.find(a => a.perpetrator === 'telmisartan' && a.victim === 'tolvaptan');
    expect(aff).toBeDefined();
    expect(aff.actor).toBe('CYP3A4');
  });

  it('compute without prose excludes text sites', () => {
    const db = mockDb(tables);
    const drugs = resolve(db, ['tolvaptan']);
    const M = compute(db, drugs, { text: false });
    expect(M.rows.every(r => r.evidence !== 'drugbank_text')).toBe(true);
  });

  it('cellOf and affectedAt helpers', () => {
    const db = mockDb(tables);
    const drugs = resolve(db, ['tolvaptan', 'telmisartan']);
    const M = compute(db, drugs, { text: false });
    const c = cellOf(M, 'tolvaptan', 'metabolism', 'liver');
    expect(c.w).toBe(3);
    const aff = affectedAt(M, 'tolvaptan', null, 'liver');
    expect(aff.length).toBe(1);
  });
});

describe('dbs-pksites component', () => {
  beforeEach(() => {
    Pksites.dbCache.clear();
    Pksites.bodyCache.clear();
    Pksites.sqlPromise = null;
  });

  it('renders the placeholder status when db is empty', async () => {
    const { appHost } = await createFixture(
      '<dbs-pksites></dbs-pksites>',
      class {},
      [Pksites],
    ).started;

    const el = appHost.querySelector('dbs-pksites');
    expect(el).toBeTruthy();
    const vm = CustomElement.for(el).viewModel;
    expect(vm).toBeInstanceOf(Pksites);
    // no db -> explanatory placeholder, nothing fetched
    expect(vm.dbInstance).toBeNull();
    expect(vm.status).toContain('db=');
    const shadow = el.shadowRoot;
    expect(shadow.querySelector('.pksites')).toBeTruthy();
    expect(shadow.querySelector('.pkq-status').textContent).toContain('db=');
  });

  it('bound() normalizes string attributes', () => {
    const vm = Object.create(Pksites.prototype);
    vm.showDdi = 'false';
    vm.includeText = '0';
    vm.max = '4';
    vm.bound();
    expect(vm.showDdi).toBe(false);
    expect(vm.includeText).toBe(false);
    expect(vm.max).toBe(4);
  });

  it('deriveBase falls back to the CDN', () => {
    const vm = Object.create(Pksites.prototype);
    expect(vm.deriveBase('')).toBe('https://sql.js.org/dist/');
    expect(vm.deriveBase('assets/sqljs/sql-wasm.js')).toBe('assets/sqljs/');
  });

  it('selects, searches and recomputes against the mock db', () => {
    const vm = Object.create(Pksites.prototype);
    vm.element = { dispatchEvent: jest.fn() };
    vm.dbInstance = mockDb(tables);
    vm.drugs = 'tolvaptan,telmisartan';
    vm.max = 8;
    vm.focus = null;
    vm.includeText = true;
    vm.showDdi = true;
    vm.searchTerm = '';
    vm.hits = [];
    vm.sel = [];
    vm.model = null;
    vm.heatmapEl = document.createElement('div');
    vm.tableEl = document.createElement('div');

    vm.initSelFromDrugs();
    expect(vm.sel.map(d => d.slug)).toEqual(['tolvaptan', 'telmisartan']);

    vm.searchTerm = 'Tol';
    vm.onSearch();
    expect(vm.hits.some(h => h.slug === 'tolvaptan')).toBe(true);
    vm.searchTerm = 'x';
    vm.onSearch();
    expect(vm.hits).toEqual([]);

    vm.recomputeAndRender();
    expect(vm.model.rows.length).toBe(7);
    expect(vm.metaText).toContain('7 site row');
    // sync render paths populate the fake refs (renderAll itself is deferred)
    vm.renderHeatmap();
    expect(vm.heatmapEl.innerHTML).toContain('pks-hm');
    vm.renderTable();
    expect(vm.tableEl.innerHTML).toContain('CYP3A4');

    vm.removeDrug('telmisartan');
    expect(vm.sel.map(d => d.slug)).toEqual(['tolvaptan']);
    expect(vm.element.dispatchEvent).toHaveBeenCalled();
    vm.toggleFocus('tolvaptan');
    expect(vm.focus).toBe('tolvaptan');
    vm.toggleFocus('tolvaptan');
    expect(vm.focus).toBeNull();
  });

  it('evidenceCell labels the tiers', () => {
    const vm = Object.create(Pksites.prototype);
    expect(vm.evidenceCell({ evidence: 'drugbank_actor' })).toBe('DrugBank actor');
    expect(vm.evidenceCell({ evidence: 'drugbank_text' })).toBe('DrugBank ADME prose');
    expect(vm.evidenceCell({ evidence: 'paper_pgx', source: 'S', page: null, doi: null })).toContain('paper PGx');
  });
});
