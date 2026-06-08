import { createRegistry } from '../register.js';
import { Webllmchat } from './webllmchat.js';

const registry = createRegistry();
registry.define('dbs-webllmchat', Webllmchat);
