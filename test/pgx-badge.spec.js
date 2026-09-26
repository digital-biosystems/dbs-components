import { PgxBadge } from '../src/pgxbadge/pgx-badge.js';

function makeBadge(overrides = {}) {
  const b = new PgxBadge();
  Object.assign(b, {
    descriptions: ['Use as directed', 'Use with caution.', 'Do not use.'],
  }, overrides);
  return b;
}

describe('PgxBadge state mapping', () => {
  it.each([
    [0, 'w3-pale-green', 'Use as directed'],
    [1, 'w3-pale-orange', 'Use with caution.'],
    [2, 'w3-pale-red', 'Do not use.'],
  ])('state %i maps color/description', (state, color, description) => {
    const b = makeBadge({ state });
    b.bound();
    expect(b.internalstate).toBe(state);
    expect(b.color).toBe(color);
    expect(b.description).toBe(description);
  });

  it('builds fulldescription from prefix + description + suffix', () => {
    const b = makeBadge({ state: 1 });
    b.bound();
    expect(b.fullprefix).toBe('CAUTION');
    expect(b.fulldescription).toContain('CAUTION');
    expect(b.fulldescription).toContain('Use with caution.');
    expect(b.fulldescription).toContain('Dosage or regimen needs to be changed.');
  });

  it('coerces string state in bound()', () => {
    const b = makeBadge({ state: '2' });
    b.bound();
    expect(b.internalstate).toBe(2);
    expect(b.color).toBe('w3-pale-red');
  });

  it('stateChanged updates derived fields', () => {
    const b = makeBadge({ state: 0 });
    b.bound();
    expect(b.color).toBe('w3-pale-green');
    b.stateChanged(2);
    expect(b.color).toBe('w3-pale-red');
    expect(b.description).toBe('Do not use.');
    b.stateChanged('1');
    expect(b.internalstate).toBe(1);
    expect(b.color).toBe('w3-pale-orange');
  });

  it('reflects custom descriptions bindable', () => {
    const b = makeBadge({ state: 0, descriptions: ['a', 'b', 'c'] });
    b.bound();
    expect(b.description).toBe('a');
    b.stateChanged(2);
    expect(b.description).toBe('c');
  });
});
