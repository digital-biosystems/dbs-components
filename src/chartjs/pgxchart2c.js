import { customElement ,useShadowDOM,resolve } from 'aurelia'
@customElement('dbs-pgxchart2c')
export class Pgxchart2c{


    drugname = 'Ibuprofen';    
        element = resolve(Element);

    attached() {
        //console.log('shadowroot',this.shadowRoot)
        //console.log('element',this.element)
    }

}