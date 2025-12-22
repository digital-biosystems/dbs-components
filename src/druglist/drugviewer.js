import { bindable, customElement } from 'aurelia';
import alldrugs from './alldrugs.json';
//@inject(NewInstance.of(Router))

@customElement('dbs-drugviewer')
export class Drugviewer {
  drugs = alldrugs;
  @bindable searchTerm = '';
  @bindable selectedAtc = '';

  filteredDrugs = [];
  displayCount = 0;
  pkChartData = null;

  _allDrugs = [];

  bound() {
    this.filteredDrugs = [];
  }

  drugsChanged(newValue) {
    this._allDrugs = newValue || [];
    this.updateFilter();
  }

  searchTermChanged() {
    console.log('searchTermChanged', this.searchTerm);
    this.updateFilter();
  }

  selectedAtcChanged() {
    this.updateFilter();
  }

  updateFilter() {
    console.log('updateFilter', this.searchTerm, this.selectedAtc);
    let filtered = [...this.drugs];
    
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(drug => 
        drug.generic_name?.toLowerCase().includes(term) ||
        drug.atc?.toLowerCase().includes(term) ||
        drug.synonyms?.some((s) => s.toLowerCase().includes(term))
      );
    }

    if (this.selectedAtc) {
      filtered = filtered.filter(drug => drug.atc === this.selectedAtc);
    }

    this.filteredDrugs = filtered;
    this.displayCount = filtered.length;
  }

  selectDrug(drug) {
    this.pkChartData = {
      labels: ['Central Vd', 'Peripheral Vd', 'Clearance', 'Bioavailability'],
      datasets: [{
        label: `${drug.generic_name} (${drug.atc})`,
        data: [
          drug.pk?.volume_of_distribution || 0,
          drug.pk?.peripheral_vd?.[0] || 0,
          drug.pk?.clearance || 0,
          drug.pk?.bioavailability || 0
        ],
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0']
      }]
    };
  }

  clearFilter() {
    this.searchTerm = '';
    this.selectedAtc = '';
  }

  get uniqueAtcs() {
    return [...new Set(this._allDrugs.map(d => d.atc))];
  }
}
