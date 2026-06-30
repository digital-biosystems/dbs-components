import { createRegistry } from '../register.js';
import { Summary } from './summary.js';

const registry = createRegistry();
registry.define('dbs-summary', Summary);
