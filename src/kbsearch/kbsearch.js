import { IEventAggregator, resolve,bindable } from 'aurelia';
//import { bindable } from 'aurelia';

//custom element decorator for use in dev-app
@customElement('dbs-kbsearch')
export class Kbsearch {
    @bindable showinput = false;
    @bindable query = "";

    constructor(){
         this.ea = resolve(IEventAggregator);
    }

    bound(){                
        // Expose globally event aggregator
        window.DbsKbsearch = this.ea;

        this.myEventSubscription = this.ea.subscribe('kbsearch:query', msg => {
            this.query = msg;
            //this.search();
        });
        if (typeof this.showinput === 'string'){
            this.showinput = (this.showinput.toLowerCase() === 'true');
        }
       
    }
    unbinding(){
        this.myEventSubscription.dispose();
    }
    
    search() {
        console.log("Searching for:", this.query);
        // Implement your search logic here
        this.ea.publish('kbsearch:result', {query:this.query,result:'Placeholder results'});
    }

    queryChanged(newValue, oldValue) {
        console.log(`Query changed from ${oldValue} to ${newValue}`);
        this.search();
    }

}