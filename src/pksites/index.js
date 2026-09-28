import { createRegistry } from '../register.js';
import { Pksites } from './pksites.js';

const registry = createRegistry();
registry.define('dbs-pksites', Pksites);
