import { createRegistry } from '../register.js';
import { Druglist } from './druglist.js';
import { Drugviewer } from './drugviewer.js';
import { Drugcard } from './drugcard.js';

const registry = createRegistry();
registry.define('dbs-druglist', Druglist);
registry.define('dbs-drugviewer', Drugviewer);
registry.define('dbs-drugcard', Drugcard);
