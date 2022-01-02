import { Bot } from '@qq-guild-sdk/core';
import { createBot } from 'qq-guild-sdk';
import secrets from './secrets';

// 创建一个 bot
const bot = createBot({
  app: {
    // 集成了 dotenv 模块，可以自动读取环境变量
    id: secrets.qqGuildBotId,
    key: secrets.qqGuildSecret,
    token: secrets.qqGuildToken,
  },
  sandbox: false,
});

async function main() {
  // 启动 wss 连接服务，并设置本次连接权限
  await bot.startClient(Bot.Intents.AT_MESSAGE | Bot.Intents.GUILDS);
  bot.on('ready', () => {
    console.log('Bot is ready.');
  });
  bot.on('message', async (msg) => {
    console.log('received message:', msg.content);
    const res = await bot.send.channel.reply(msg.id, msg.channelId, 'pong');
    console.log(res);
  });
}

// 捕获异常
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
