import { createRegistry } from '../register.js';
import { ButtonParams } from './button-params.js';

const registry = createRegistry();
registry.define('dbs-buttonparams', ButtonParams);
