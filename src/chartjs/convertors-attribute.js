import { customAttribute, bindable, resolve} from 'aurelia';
import { Node } from '@aurelia/runtime-html';

@customAttribute('dbs-convertors')
export class ConvertorsAttribute {
    @bindable value = '';
    element = resolve(INode);
    
    constructor() {
        //this.hostController = resolve(ICustomElementController);
    }

    bound() {
        this.element.viewModel.operation = this.parse(this.value);
    }

    valueChanged(newValue) {
        this.element.viewModel.operation = this.parse(newValue);
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
            console.log('dbs-convertors: evaluating expression:' + cv + ' securely filtered to:' + expression);
            // eslint-disable-next-line no-eval
            return x => eval(expression);
        });
    }
}
