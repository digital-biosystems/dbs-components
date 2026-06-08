import { createRegistry } from '../register.js';
import { Value } from './value.js';

const registry = createRegistry();
registry.define('dbs-value', Value);
