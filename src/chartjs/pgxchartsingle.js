import { customElement, resolve } from 'aurelia'
@customElement('dbs-pgxchartsingle')
export class Pgxchartsingle{


    drugname = 'Ibuprofen';    
        element = resolve(Element);

    attached() {
        //console.log('shadowroot',this.shadowRoot)
        //console.log('element',this.element)
    }

}