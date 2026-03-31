//export { HelloWorld } from 'basic/hello-world';

import { WcCustomElementRegistry } from '@aurelia/web-components'; 
import { DI, Registration  } from '@aurelia/kernel';
import { StandardConfiguration, IPlatform } from '@aurelia/runtime-html';
import {BrowserPlatform} from '@aurelia/platform-browser'
import { StyleConfiguration } from 'aurelia';
// Create the Aurelia container
const container = DI.createContainer();
// Register the platform
container.register(
  Registration.instance(IPlatform, BrowserPlatform.getOrCreate(globalThis)));
// Register the StandardConfiguration
container.register(StandardConfiguration); // This registers core services like IExpressionParser
container.register(StyleConfiguration.shadowDOM({
  // Configuration options here
}))
const registry = container.get(WcCustomElementRegistry);

import { Chartjs3 } from './chartjs3';
import { Pgxchart } from './pgxchart';
import { Pgxchart2c } from './pgxchart2c';
import { Pgxchartsingle } from './pgxchartsingle';
import { Pgxchartd } from './pgxchartd';
import { Fmi} from '../fmi/fmi';
import {Chartjs4} from './chartjs4';
import {Range} from './range';

registry.define('dbs-chartjs3', Chartjs3);
registry.define('dbs-pgxchart', Pgxchart);
registry.define('dbs-pgxchart2c', Pgxchart2c);
registry.define('dbs-pgxchartsingle', Pgxchartsingle);
registry.define('dbs-pgxchartd', Pgxchartd);
registry.define('dbs-fmi', Fmi);
registry.define('dbs-chartjs4',Chartjs4)
registry.define('dbs-range',Range)
