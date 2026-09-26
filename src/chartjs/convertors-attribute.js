import { customAttribute, bindable, resolve, IController, INode } from 'aurelia';
import { parseConvertors } from '../utils/convertors.js';

@customAttribute('dbs-convertors')
export class ConvertorsAttribute {
    @bindable value = '';
    element = resolve(INode);
    
    constructor() {
        this.hostController = resolve(IController);
    }

    bound() {
        this.hostController.viewModel.operation = parseConvertors(this.value);
    }

    valueChanged(newValue) {
        this.hostController.viewModel.operation = parseConvertors(newValue);
    }
}
