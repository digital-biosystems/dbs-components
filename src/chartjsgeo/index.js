import { createRegistry } from '../register.js';
import { ChartjsGeo } from './chartjs-geo.js';

const registry = createRegistry();
registry.define('dbs-chartjs-geo', ChartjsGeo);
