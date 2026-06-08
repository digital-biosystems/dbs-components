import { createRegistry } from '../register.js';
import { HelloWorld } from './hello-world.js';

const registry = createRegistry();
registry.define('dbs-hello-world', HelloWorld);
