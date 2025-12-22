import { bindable,customElement } from 'aurelia';

//@inject(NewInstance.of(Router))
@customElement('dbs-drugcard')
export class Drugcard {
  @bindable drug;
  
  /**get pkSummary() {
    const pk = this.drug.pk || {};
    return `${pk.drug || 'N/A'} (${pk.number_of_compartments || '?'}C model, F=${pk.bioavailability || '?'})`;
  }*/
}
