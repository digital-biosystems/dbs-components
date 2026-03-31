import { customElement, bindable,resolve,IEventAggregator } from 'aurelia'
@customElement('dbs-range')
export class Range {
    @bindable value = 1;
    // In connectedCallback, after setting min/max
    //numTicks = 5;
    ticks = [];
    @bindable id = '';
    @bindable label = '';
    @bindable min = 0;
    @bindable max = 1;
    @bindable step = 0.1;
    @bindable tickstep = 0.5;
    @bindable default = 0.1;

    ticks = [];
    constructor(){
            this.ea = resolve(IEventAggregator);
        
    }

    bound() {
        if (typeof this.min === 'string') this.min = parseFloat(this.min)
        if (typeof this.max === 'string') this.max = parseFloat(this.max)
        if (typeof this.step === 'string') this.step = parseFloat(this.step)
        if (typeof this.tickstep === 'string') this.tickstep = parseFloat(this.tickstep)            
        else {
            this.tickstep = (this.max - this.min) / 5;
        }
        if (typeof this.default === 'string') this.value = parseFloat(this.default) 
        else this.value = this.min;
        
        this.generateTicks();
    }

    minChanged() {
        if (typeof this.min === 'string') this.min = parseFloat(this.min)
        this.generateTicks();
    }
    maxChanged() {
        if (typeof this.max === 'string') this.max = parseFloat(this.max)
        this.generateTicks();
    }
    valueChanged(newValue) {
        console.log('dbs-range valueChanged()',newValue);
        if (typeof newValue === 'string') this.value = parseFloat(newValue)
        //remain UI responsive by publishing event after current execution context
        setTimeout(() => {
            this.ea.publish('fmiinput', { detail:{id: this.id, value: this.value }});
        }, 0);
    }

    generateTicks() {
        // Determine decimal places from step
        let decimals = 0;
        if (typeof this.step === 'number' && !Number.isInteger(this.step)) {
            const stepStr = this.step.toString();
            if (stepStr.includes('.')) {
                decimals = stepStr.split('.')[1].length;
            }
        }
        this.ticks = [];
        for (let i = this.min; i <= this.max; i += this.tickstep) {
            this.ticks.push(i.toFixed(decimals));
        }
    }
}