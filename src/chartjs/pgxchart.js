import { customElement,useShadowDOM,resolve } from 'aurelia'
@customElement('dbs-pgxchart')
@useShadowDOM({ mode: 'open' })
export class Pgxchart{


    drugname = 'Ibuprofen';
    element = resolve(Element);

    attached() {
        //console.log('shadowroot',this.shadowRoot)
        //console.log('element',this.element)
    }

}