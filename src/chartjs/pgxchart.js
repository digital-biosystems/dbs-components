import { customElement,resolve } from 'aurelia'
@customElement('dbs-pgxchart')
export class Pgxchart{


    drugname = 'Ibuprofen';
    element = resolve(Element);

    attached() {
        //console.log('shadowroot',this.shadowRoot)
        //console.log('element',this.element)
    }

}