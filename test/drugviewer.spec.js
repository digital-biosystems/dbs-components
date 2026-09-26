import { Drugviewer } from '../src/druglist/drugviewer.js';
import { Drugcard } from '../src/druglist/drugcard.js';

const SAMPLE = [
  { generic_name: 'Aspirin', atc: 'B01AC06', synonyms: ['Acetylsalicylic acid'], pk: { volume_of_distribution: 0.15, peripheral_vd: [0.2], clearance: 0.5, bioavailability: 0.9 } },
  { generic_name: 'Ibuprofen', atc: 'M01AE01', synonyms: ['Advil', 'Motrin'], pk: { volume_of_distribution: 0.12, peripheral_vd: [0.18], clearance: 0.04, bioavailability: 0.95 } },
  { generic_name: 'Paracetamol', atc: 'N02BE01', synonyms: ['Acetaminophen'], pk: {} },
];

function makeViewer() {
  const v = new Drugviewer();
  v.drugs = SAMPLE;
  v.searchTerm = '';
  v.selectedAtc = '';
  v.filteredDrugs = [];
  v.displayCount = 0;
  v.pkChartData = null;
  v._allDrugs = [];
  return v;
}

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  console.log.mockRestore();
});

describe('Drugviewer.updateFilter', () => {
  it('returns all drugs without filters', () => {
    const v = makeViewer();
    v.updateFilter();
    expect(v.filteredDrugs).toHaveLength(3);
    expect(v.displayCount).toBe(3);
  });

  it('matches generic_name case-insensitively', () => {
    const v = makeViewer();
    v.searchTerm = 'asp';
    v.updateFilter();
    expect(v.filteredDrugs.map((d) => d.generic_name)).toEqual(['Aspirin']);
  });

  it('matches atc and synonyms', () => {
    const v = makeViewer();
    v.searchTerm = 'm01ae01';
    v.updateFilter();
    expect(v.filteredDrugs.map((d) => d.generic_name)).toEqual(['Ibuprofen']);
    v.searchTerm = 'advil';
    v.updateFilter();
    expect(v.filteredDrugs.map((d) => d.generic_name)).toEqual(['Ibuprofen']);
  });

  it('selectedAtc narrows further with exact match', () => {
    const v = makeViewer();
    v.searchTerm = 'in';
    v.selectedAtc = 'M01AE01';
    v.updateFilter();
    expect(v.filteredDrugs.map((d) => d.generic_name)).toEqual(['Ibuprofen']);
  });
});

describe('Drugviewer.selectDrug / clearFilter / uniqueAtcs', () => {
  it('builds pkChartData with fallbacks', () => {
    const v = makeViewer();
    v.selectDrug(SAMPLE[0]);
    expect(v.pkChartData.labels).toHaveLength(4);
    expect(v.pkChartData.datasets[0].label).toContain('Aspirin');
    expect(v.pkChartData.datasets[0].data).toEqual([0.15, 0.2, 0.5, 0.9]);
    v.selectDrug(SAMPLE[2]);
    expect(v.pkChartData.datasets[0].data).toEqual([0, 0, 0, 0]);
  });

  it('clearFilter resets bindables', () => {
    const v = makeViewer();
    v.searchTerm = 'x';
    v.selectedAtc = 'y';
    v.clearFilter();
    expect(v.searchTerm).toBe('');
    expect(v.selectedAtc).toBe('');
  });

  it('uniqueAtcs dedupes _allDrugs atc codes', () => {
    const v = makeViewer();
    v.drugsChanged([...SAMPLE, { ...SAMPLE[0] }]);
    expect(v.uniqueAtcs.sort()).toEqual(['B01AC06', 'M01AE01', 'N02BE01']);
  });

  it('bound() starts with empty filteredDrugs', () => {
    const v = makeViewer();
    v.bound();
    expect(v.filteredDrugs).toEqual([]);
  });
});

describe('Drugcard', () => {
  it('holds the bound drug', () => {
    const c = new Drugcard();
    c.drug = SAMPLE[1];
    expect(c.drug.generic_name).toBe('Ibuprofen');
  });
});
