import { customElement,resolve } from 'aurelia'
@customElement('dbs-pgxchartd')
export class Pgxchartd{


    drugname = 'Ibuprofen';
    element = resolve(Element);

    attached() {
        //console.log('shadowroot',this.shadowRoot)
        //console.log('element',this.element)
    }

}