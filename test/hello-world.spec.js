import { HelloWorld } from '../src/helloworld/hello-world.js';
import { createFixture } from '@aurelia/testing';

describe('hello-world', () => {
  it('should render message', async () => {
    const { assertText } = await createFixture(
      '<dbs-hello-world message.bind="message"></dbs-hello-world>',
      { message: "foo" },
      [HelloWorld],
    ).started;

    assertText('Hello World DBS! foo', { compact: true });
  });
});
