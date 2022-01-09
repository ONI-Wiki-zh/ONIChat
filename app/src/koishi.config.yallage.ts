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
import smms from 'koishi-plugin-assets-smms';
import fs from 'fs';
import { LinkConfig } from './plugins/party-line-phone';
import secrets from './secrets';
import { Logger } from 'koishi';

const isDev = process.env.NODE_ENV !== 'production';
new Logger('').success(isDev ? 'Development mode!' : 'Production mode');

let chromePath = `C:/Program Files/Google/Chrome/Application/chrome.exe`;
if (!fs.existsSync(chromePath)) chromePath = '';

const dcConfig: DCConfig = {
  token: secrets.yallage.discordToken,
};

const relay2Config: LinkConfig = [
  {
    msgPrefix: '【二群】',
    platform: 'onebot',
    usePrefix: true,
    channelId: '909382878',
    botId: secrets.yallage.onebotId,
  },
  {
    atOnly: true,
    msgPrefix: '【DC】',
    usePrefix: true,
    platform: 'discord',
    channelId: '929783973587066940',
    guildId: '888755372217753610',
    botId: secrets.yallage.discordId,
    webhookID: secrets.yallage.relayWebhookID2,
    webhookToken: secrets.yallage.relayWebhookToken2,
  },
];

const relay3Config: LinkConfig = [
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
    webhookID: secrets.yallage.relayWebhookID3,
    webhookToken: secrets.yallage.relayWebhookToken3,
  },
];

const relayTestConfig: LinkConfig = [
  {
    msgPrefix: '【测试群】',
    platform: 'onebot',
    usePrefix: true,
    channelId: '720939872',
    botId: secrets.yallage.onebotIdT1,
  },
  {
    msgPrefix: '【DC测1】',
    platform: 'discord',
    channelId: '929506178390696027',
    guildId: '888755372217753610',
    botId: secrets.yallage.discordId,
    webhookID: secrets.yallage.relayWebhookIDT1,
    webhookToken: secrets.yallage.relayWebhookTokenT1,
  },
  {
    atOnly: true,
    msgPrefix: '【DC测2】',
    platform: 'discord',
    channelId: '929508886032048198',
    guildId: '888755372217753610',
    botId: secrets.yallage.discordId,
    webhookID: secrets.yallage.relayWebhookIDT2,
    webhookToken: secrets.yallage.relayWebhookTokenT2,
  },
];

const linksConfig = [relayTestConfig];
if (!isDev) linksConfig.push(relay2Config);
if (!isDev) linksConfig.push(relay3Config);

const smmsConfig: smms.Config = {
  token: secrets.yallage.smmsToken
}

const conf = defineConfig({
  // Wait until it has access control
  // host: "0.0.0.0",
  port: 8084,
  nickname: ['yallage'],
  plugins: {
    'adapter-onebot': {
      protocol: 'ws',
      // 对应 cqhttp 配置项 ws_config.port
      endpoint: secrets.yallage.onebotServer,
      selfId: isDev ? secrets.yallage.onebotIdT1 : secrets.yallage.onebotId,
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
    'assets-smms': smmsConfig,
    './plugins/party-line-phone': {
      links: linksConfig,
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
export default conf;
