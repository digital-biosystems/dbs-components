import { createRegistry } from '../register.js';
import { Table } from './table.js';

const registry = createRegistry();
registry.define('dbs-table', Table);
