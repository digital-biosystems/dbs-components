import { customElement,bindable } from 'aurelia';

//custom element decorator for use in dev-app
@customElement('dbs-hello-world')
export class HelloWorld {
  @bindable message = "";
}
