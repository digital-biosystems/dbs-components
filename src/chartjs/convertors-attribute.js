import { customAttribute, bindable, resolve, INode} from 'aurelia';
import { Node } from '@aurelia/runtime-html';

@customAttribute('dbs-convertors')
export class ConvertorsAttribute {
    @bindable value = '';
    element = resolve(INode);
    
    constructor() {
        //this.hostController = resolve(ICustomElementController);
    }

    bound() {
        //console.log('dbs-convertors: bound with value:' + this.value);
        // only set the operation if there is a value, otherwise leave it as default (identity) in the chart component
        //console.log('dbs-convertors: element is:', this.element);
        //console.log('dbs-convertors: this is:', this);
        if (this.value)
            if (this.element.operation) {
                this.element.operation = this.parse(this.value);
            } else {
                console.warn('dbs-convertors: element has no operation property to set, convertors will not work');
            }
            //this.element.operation = this.parse(this.value);
    }

    valueChanged(newValue) {
        if (newValue)
            this.element.operation = this.parse(newValue);
    }

    parse(convertorsStr) {
        if (!convertorsStr) return [];
        const identity = x => x;
        return convertorsStr.split(';').map(cv => {
            if (cv.includes(',')) {
                const parts = cv.split(',');
                if (parts[0] === '1' && parts[1] === '1') return identity;
                const numerator = parseFloat(parts[0]);
                const denominator = parseFloat(parts[1]);
                const addend = parts.length > 2 ? parseFloat(parts[2]) : 0;
                return x => (x * numerator / denominator) + addend;
            }
            if (cv === '1/x') return x => 1 / x;
            // for eval() security filter only allowed characters:
            // algebraic, digits, e, dot, modulo, parenthesis, 'x' and 'e'
            const expression = cv.replace(/[^-\d/*+.()%xe]/g, '');
            //console.log('dbs-convertors: evaluating expression:' + cv + ' securely filtered to:' + expression);
            // eslint-disable-next-line no-eval
            return x => eval(expression);
        });
    }
}
