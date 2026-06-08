import { createRegistry } from '../register.js';
import { Kbsearch } from './kbsearch.js';

const registry = createRegistry();
registry.define('dbs-kbsearch', Kbsearch);
