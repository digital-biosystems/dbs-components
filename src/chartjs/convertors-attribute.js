import { customAttribute, bindable, resolve, IController } from 'aurelia';
import { parseConvertors } from '../utils/convertors.js';

@customAttribute('dbs-convertors')
export class ConvertorsAttribute {
    @bindable value = '';

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
