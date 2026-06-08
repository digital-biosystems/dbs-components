import { createRegistry } from '../register.js';
import { Chartjs3 } from './chartjs3.js';
import { Pgxchart } from './pgxchart.js';
import { Pgxchart2c } from './pgxchart2c.js';
import { Pgxchartsingle } from './pgxchartsingle.js';
import { Pgxchartd } from './pgxchartd.js';
import { Fmi } from '../fmi/fmi.js';
import { Chartjs4 } from './chartjs4.js';
import { Range } from './range.js';

const registry = createRegistry();
registry.define('dbs-chartjs3', Chartjs3);
registry.define('dbs-pgxchart', Pgxchart);
registry.define('dbs-pgxchart2c', Pgxchart2c);
registry.define('dbs-pgxchartsingle', Pgxchartsingle);
registry.define('dbs-pgxchartd', Pgxchartd);
registry.define('dbs-fmi', Fmi);
registry.define('dbs-chartjs4', Chartjs4);
registry.define('dbs-range', Range);
