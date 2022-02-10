/** Issue #429 of koishi */

import memory from '@koishijs/plugin-database-memory';
import mock from '@koishijs/plugin-mock';
import {} from '@koishijs/plugin-rate-limit';
import { App, observe } from 'koishi';

type TestChannelFiled = Record<string, { a: string }>;

declare module 'koishi' {
  interface Channel {
    jsonField: TestChannelFiled;
  }
}

const app = new App();
app.plugin(mock);
app.plugin(memory);
app.model.extend('channel', {
  jsonField: {
    type: 'json',
    initial: {},
  },
});

app
  .command('initField')
  .channelFields(['jsonField'])
  .action(async ({ session }) => {
    if (!session?.channel) throw new Error();
    session.channel.jsonField = {
      k1: { a: 'a1' },
      k2: { a: 'a2' },
    };
    return 'success';
  });

app
  .command('deleteAndCheck')
  .channelFields(['jsonField'])
  .action(async ({ session }) => {
    if (!session?.channel?.jsonField?.['k1']) throw new Error();
    delete session.channel.jsonField['k1'];
    if ('k1' in session.channel.jsonField)
      throw new Error('k1 should not exist!');
    if (session.channel.jsonField['k1'])
      throw new Error('k1 should have been deleted!');
    return 'success';
  });

const client = app.mock.client('mockUser', 'mockChannel');

before(async () => {
  await app.start();
  // await app.mock.initUser('mockUser', 111);
  // await app.mock.initChannel('mockChannel');
});

it('with app', async () => {
  await client.shouldReply('initField'.toLowerCase(), 'success');
  await client.shouldReply('deleteAndCheck'.toLowerCase(), 'success');
  return;
});

it('bare observe', async () => {
  const target: TestChannelFiled = {
    k1: { a: 'a1' },
    k2: { a: 'a2' },
  };
  const obj = observe(target, 'foo');
  delete obj['k1'];
  if (obj['k1']) throw new Error('Should never have k1');
  return;
});

after(async () => {
  app.stop();
  return;
});
