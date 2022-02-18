import memory from '@koishijs/plugin-database-memory';
import mock from '@koishijs/plugin-mock';
import { apply as rate } from '@koishijs/plugin-rate-limit';
import { App, sleep, Time } from 'koishi';

const app = new App();
app.plugin(mock);
app.plugin(memory);
app.plugin(rate);

app.command('foo', { minInterval: 10 * Time.second }).action(() => 'bar');

const client = app.mock.client('user1');

before(async () => {
  await app.start();
  await app.mock.initUser('user1', 1);
});

it('Dummy MinInterval', async () => {
  await client.shouldReply('foo', 'bar');
  await sleep(1 * Time.second);
  await client.shouldReply('foo', '调用过于频繁，请稍后再试。');
  return;
}).timeout(5 * Time.second);
