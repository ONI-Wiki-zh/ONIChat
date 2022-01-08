import { defineConfig } from '@koishijs/cli';
import { BotConfig as DCConfig } from '@koishijs/plugin-adapter-discord';
import {} from '@koishijs/plugin-adapter-onebot';
// import {} from '@koishijs/plugin-adapter-telegram';
import {} from '@koishijs/plugin-admin';
import {} from '@koishijs/plugin-chat';
import {} from '@koishijs/plugin-common';
import {} from '@koishijs/plugin-console';
import {} from '@koishijs/plugin-database-mysql';
import {} from '@koishijs/plugin-manager';
import {} from '@koishijs/plugin-status';
import {} from '@koishijs/plugin-switch';
import {} from '@koishijs/plugin-teach';
import {} from 'koishi-plugin-assets-smms';
import fs from 'fs';
import { LinkConfig } from './plugins/party-line-phone';
import secrets from './secrets';

const isDev = process.env.NODE_ENV !== 'production';
console.log(isDev ? 'Development mode!' : 'Production mode');

let chromePath = `C:/Program Files/Google/Chrome/Application/chrome.exe`;
if (!fs.existsSync(chromePath)) chromePath = '';

const dcConfig: DCConfig = {
  token: secrets.yallage.discordToken,
};

const relayConfig: LinkConfig = [
  {
    msgPrefix: '【三群】',
    platform: 'onebot',
    usePrefix: true,
    channelId: '914098338',
    botId: secrets.yallage.onebotId,
  },
  {
    msgPrefix: '【DC】',
    usePrefix: true,
    platform: 'discord',
    channelId: '929360519163433012',
    guildId: '888755372217753610',
    botId: secrets.yallage.discordId,
    webhookID: secrets.yallage.relayWebhookID,
    webhookToken: secrets.yallage.relayWebhookToken,
  },
];

export default defineConfig({
  // Wait until it has access control
  // host: "0.0.0.0",
  port: 8084,
  nickname: ['yallage'],
  plugins: {
    'adapter-onebot': {
      protocol: 'ws',
      // 对应 cqhttp 配置项 ws_config.port
      endpoint: secrets.yallage.onebotServer,
      selfId: secrets.yallage.onebotId,
      token: secrets.yallage.onebotToken,
    },
    'adapter-discord': dcConfig,
    'database-mysql': {
      host: secrets.mysqlHost,
      // Koishi 服务器监听的端口
      port: secrets.mysqlPort,
      user: secrets.mysqlUser,
      password: secrets.mysqlPassword,
      database: 'yallage_v4',
    },
    admin: {},
    common: {
      // onRepeat: {
      //   minTimes: 3,
      //   probability: 0.5,
      // },
      // onFriendRequest: true,
    },
    // assets: {
    //   type: 'smms',
    //   token: secrets.smmsToken, // sm.ms 的访问令牌
    // },
    // github: {},
    teach: {
      prefix: '#',
      authority: { regExp: 2 },
    },
    console: {},
    manager: {},
    // status: {},
    chat: {},
    switch: {},
    'assets-smms': { token: secrets.smmsToken },
    './plugins/party-line-phone': {
      links: [relayConfig],
    },
  },
  autoAssign: true,
  autoAuthorize: 1,
  prefix: ['.', '。'],
  watch: {
    // root: 'src', // 要监听的根目录，相对于工作路径
    // 要忽略的文件列表，支持 glob patterns
    ignored: ['*.log'],
  },
  // logTime: true,
  logger: {
    levels: {
      base: 2,
      rss: 3,
    },
    showTime: true,
  },
});
