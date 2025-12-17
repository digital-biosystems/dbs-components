import { customElement } from 'aurelia'
import drugs from './druglist.json';

@customElement('dbs-druglist')
export class Druglist {
    drugs = drugs;
}