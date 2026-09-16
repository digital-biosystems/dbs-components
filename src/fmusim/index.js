import { createRegistry } from '../register.js';
import { Fmusim } from './fmusim.js';

const registry = createRegistry();
registry.define('dbs-fmusim', Fmusim);
