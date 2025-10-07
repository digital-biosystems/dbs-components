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

import { HelloWorld } from './hello-world';

registry.define('dbs-hello-world', HelloWorld);
