import { createRegistry } from '../register.js';
import { Fmi } from './fmi.js';

const registry = createRegistry();
registry.define('dbs-fmi', Fmi);
