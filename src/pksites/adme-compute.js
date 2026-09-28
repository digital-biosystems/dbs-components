import { PROC, W } from './constants.js';

export function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export function code(name) {
  const w = name.replace(/[^a-z]/gi, ' ').trim().split(/\s+/);
  const s = w.length > 1 ? w[0][0] + w[1][0] : name.slice(0, 2);
  return s[0].toUpperCase() + (s[1] || '').toLowerCase();
}

function q(db, sql, params) {
  const st = db.prepare(sql);
  st.bind(params || []);
  const out = [];
  while (st.step()) out.push(st.getAsObject());
  st.free();
  return out;
}

export function search(db, term) {
  term = (term || '').trim();
  if (term.length < 2) return [];
  const like = term.replace(/[%_]/g, '') + '%';
  return q(db,
    "SELECT slug, generic_name AS name, has_records, '' AS via FROM adme_drug WHERE generic_name LIKE ? " +
    "UNION SELECT d.slug, d.generic_name, d.has_records, s.name FROM adme_synonym s JOIN adme_drug d ON d.slug = s.drug_slug WHERE s.name LIKE ? " +
    "ORDER BY 2 LIMIT 12", [like, like]);
}

export function resolve(db, slugs) {
  const out = [];
  slugs.forEach(s => {
    const r = q(db, 'SELECT slug, generic_name AS name, drugbank_id, has_records FROM adme_drug WHERE slug = ? OR generic_name = ? LIMIT 1', [s, s]);
    if (r.length) out.push(r[0]);
  });
  return out;
}

export function compute(db, drugs, opts) {
  opts = opts || {};
  const sites = {};
  q(db, 'SELECT gene, process, tissue, uberon, cell FROM adme_site').forEach(r => {
    (sites[r.gene] = sites[r.gene] || { process: r.process, tissues: [], cell: r.cell }).tissues.push([r.tissue, r.uberon]);
  });
  const rows = [];
  const byActor = {};
  drugs.forEach(d => {
    q(db, 'SELECT gene, kind, role, evidence, source, page, doi FROM adme_actor WHERE drug_slug = ?', [d.slug]).forEach(a => {
      const site = sites[a.gene];
      const proc = site ? site.process : (a.kind === 'target' ? 'target' : a.kind === 'enzyme' ? 'metabolism' : 'distribution');
      const tissues = site ? site.tissues : [[null, null]];
      tissues.forEach(t => {
        rows.push({ drug: d.slug, process: proc, tissue: t[0], actor: a.gene, role: a.role, evidence: a.evidence, cell: site ? site.cell : null, source: a.source, page: a.page, doi: a.doi });
      });
      if (a.evidence === 'drugbank_actor') {
        const m = byActor[a.gene] = byActor[a.gene] || {};
        (m[d.slug] = m[d.slug] || {})[a.role] = 1;
      }
    });
    if (opts.text !== false) {
      q(db, 'SELECT process, tissue, quote FROM adme_text WHERE drug_slug = ?', [d.slug]).forEach(t => {
        rows.push({ drug: d.slug, process: t.process, tissue: t.tissue, actor: null, role: null, evidence: 'drugbank_text', quote: t.quote });
      });
    }
  });
  const shared = [], affected = [];
  Object.keys(byActor).forEach(gene => {
    const per = byActor[gene], ds = Object.keys(per).sort();
    for (let i = 0; i < ds.length; i++) for (let j = i + 1; j < ds.length; j++) {
      const a = ds[i], b = ds[j], ra = Object.keys(per[a]), rb = Object.keys(per[b]);
      const pert = r => r.indexOf('inhibitor') >= 0 || r.indexOf('inducer') >= 0;
      let kind = 'shared';
      if ((ra.indexOf('substrate') >= 0 && pert(rb)) || (rb.indexOf('substrate') >= 0 && pert(ra))) kind = 'ddi_candidate';
      else if (ra.indexOf('substrate') >= 0 && rb.indexOf('substrate') >= 0) kind = 'shared_substrate';
      const site = sites[gene] || {};
      shared.push({ actor: gene, a, roles_a: ra, b, roles_b: rb, kind, process: site.process || null, tissues: (site.tissues || []).map(t => t[0]) });
      if (kind === 'ddi_candidate') {
        [[a, b, ra, rb], [b, a, rb, ra]].forEach(p => {
          const perp = p[0], vict = p[1], rp = p[2], rv = p[3];
          if (rv.indexOf('substrate') >= 0 && pert(rp)) {
            const eff = rp.filter(r => r === 'inhibitor' || r === 'inducer').join('/');
            (site.tissues || [[null]]).forEach(t => {
              affected.push({ perpetrator: perp, victim: vict, actor: gene, effect: eff, process: site.process || null, tissue: t[0] });
            });
          }
        });
      }
    }
  });
  return { drugs, rows, shared, affected, sites };
}

export function cellOf(M, slug, proc, tissue) {
  const rs = M.rows.filter(r => r.drug === slug && r.process === proc && r.tissue === tissue);
  let w = 0;
  rs.forEach(r => { w = Math.max(w, W[r.evidence] || 1); });
  return { w, rows: rs };
}

export function affectedAt(M, slug, proc, tissue) {
  return M.affected.filter(a => a.victim === slug && a.tissue === tissue && (!proc || a.process === proc));
}

export function nameOf(M, slug) {
  const d = M.drugs.filter(x => x.slug === slug)[0];
  return d ? d.name : slug;
}

export function organTier(M, slug, tissue) {
  let w = 0;
  PROC.forEach(p => { w = Math.max(w, cellOf(M, slug, p, tissue).w); });
  return w;
}
