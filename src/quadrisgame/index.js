import { WcCustomElementRegistry } from '@aurelia/web-components'; 
import { DI, Registration  } from '@aurelia/kernel';
import { StandardConfiguration, IPlatform } from '@aurelia/runtime-html';
import { BrowserPlatform } from '@aurelia/platform-browser';
import { StyleConfiguration } from 'aurelia';

const container = DI.createContainer();
container.register(
  Registration.instance(IPlatform, BrowserPlatform.getOrCreate(globalThis)));
container.register(StandardConfiguration);
container.register(StyleConfiguration.shadowDOM({}));

const registry = container.get(WcCustomElementRegistry);

import { Quadrisgame } from './quadrisgame.js';

registry.define('dbs-quadrisgame', Quadrisgame);
