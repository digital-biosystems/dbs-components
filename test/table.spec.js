import { Table } from '../src/table/table.js';

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  console.log.mockRestore();
});

describe('Table', () => {
  it('derives languages from first row keys minus llm_model', () => {
    const t = new Table();
    expect(t.languages.length).toBeGreaterThan(0);
    expect(t.languages).not.toContain('llm_model');
    expect(t.rows.length).toBeGreaterThan(0);
    expect(Object.keys(t.rows[0]).filter((k) => k !== 'llm_model')).toEqual(t.languages);
  });

  it('onRowHeaderClick logs model name', () => {
    const t = new Table();
    t.onRowHeaderClick(t.rows[0]);
    expect(console.log).toHaveBeenCalledWith('Row clicked:', t.rows[0].llm_model, t.rows[0]);
  });

  it('onColumnHeaderClick maps models to language values', () => {
    const t = new Table();
    const lang = t.languages[0];
    t.onColumnHeaderClick(lang);
    expect(console.log).toHaveBeenCalledWith(
      'Column clicked:',
      lang,
      expect.arrayContaining([expect.objectContaining({ model: expect.anything(), values: expect.anything() })]),
    );
    const values = console.log.mock.calls[0][2];
    expect(values).toHaveLength(t.rows.length);
    expect(values[0]).toEqual({ model: t.rows[0].llm_model, values: t.rows[0][lang] });
  });
});
