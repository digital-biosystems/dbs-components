import { IEventAggregator, resolve,bindable } from 'aurelia';
//import { bindable } from 'aurelia';
import kb from './kgv3_full_llama3.json';
import debounce from 'lodash/debounce';

//custom element decorator for use in dev-app
@customElement('dbs-kbsearch')
export class Kbsearch {
    @bindable showinput = false;
    @bindable query = "";

    constructor(){
         this.ea = resolve(IEventAggregator);
         this.debouncedSearch = debounce(this.search.bind(this), 1000);
    }

    bound(){                
        // Expose globally event aggregator
        window.DbsKbsearch = this.ea;

        this.myEventSubscription = this.ea.subscribe('kbsearch:query', msg => {
            this.query = msg;
            //this.search();
        });
        this.myEventSubscription2 = this.ea.subscribe('kbget:result', msg => {
            //this.query = msg;
            //this.search();
            this.get(msg);
        });
        if (typeof this.showinput === 'string'){
            this.showinput = (this.showinput.toLowerCase() === 'true');
        }
       
    }
    unbinding(){
        this.myEventSubscription.dispose();
    }

    get(queryid) {        
        let result = kb.knowledge[queryid];
        this.ea.publish('kbget:result', result);
    }
    
    search() {
        console.log("Searching for:", this.query);
        const lower = this.query.toLowerCase();
        console.log("knowledge:", kb);
        this.result = Object.entries(kb.knowledge)
    .filter(([key, value]) => 
      value.name && value.name.toLowerCase().includes(lower)
    )
    .map(([key, value]) => ({
      hash: key,
      name: value.name,
    }));
        console.log("Search results:", this.result);
        this.ea.publish('kbsearch:result', {query:this.query,result:this.result});
    }

    queryChanged(newValue, oldValue) {
        console.log(`Query changed from ${oldValue} to ${newValue}`);
        this.debouncedSearch();
    }
    

}