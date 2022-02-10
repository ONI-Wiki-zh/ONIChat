import { defineConfig } from '@koishijs/cli';
import { BotConfig as DCConfig } from '@koishijs/plugin-adapter-discord';
import {} from '@koishijs/plugin-adapter-onebot';
import {} from '@koishijs/plugin-adapter-telegram';
import {} from '@koishijs/plugin-admin';
import {} from '@koishijs/plugin-chat';
import {} from '@koishijs/plugin-console';
import {} from '@koishijs/plugin-database-mysql';
import {} from '@koishijs/plugin-github';
import {} from '@koishijs/plugin-manager';
import {} from '@koishijs/plugin-puppeteer';
import {} from '@koishijs/plugin-status';
import {} from '@koishijs/plugin-switch';
import {} from '@koishijs/plugin-teach';
import {} from 'koishi-plugin-assets-smms';
import fs from 'fs';
// import {} from 'koishi-plugin-blive';
// import { Config as BDConfig } from '../../packages/koishi-plugin-bdynamic';
// import {
//   Config as WikiConfig,
//   Flags as WikiFlags,
// } from '../../packages/koishi-plugin-mediawiki';
import { LinkConfig } from './plugins/party-line-phone';
import {} from './plugins/rssPlus';
import secrets from './secrets';

const isDev = process.env.NODE_ENV !== 'production';
console.log(isDev ? 'Development mode!' : 'Production mode');

let chromePath = `C:/Program Files/Google/Chrome/Application/chrome.exe`;
if (!fs.existsSync(chromePath)) chromePath = '';

const dcConfig: DCConfig = {
  token: isDev ? secrets.discordTokenTest : secrets.discordToken,
};

const relayONIWiki: LinkConfig = [
  {
    platform: 'onebot',
    usePrefix: true,
    channelId: '878046487',
    botId: secrets.onebotId,
  },
  {
    platform: 'discord',
    channelId: '903611430895509504',
    guildId: '878856205496369192',
    botId: secrets.discordId,
    webhookID: secrets.relayWebhookID,
    webhookToken: secrets.relayWebhookToken,
  },
];

const relayDCTest: LinkConfig = [
  {
    msgPrefix: '测试DC1：',
    usePrefix: true,
    platform: 'discord',
    channelId: '910867818780692480',
    guildId: '910009410854731788',
    botId: secrets.discordIdTest,
    webhookID: secrets.relayWebhookIDTest,
    webhookToken: secrets.relayWebhookTokenTest,
  },
  {
    msgPrefix: '测试DC2：',
    usePrefix: true,
    platform: 'discord',
    channelId: '910867837537644564',
    guildId: '910009410854731788',
    botId: secrets.discordIdTest,
    webhookID: secrets.relayWebhookIDTest2,
    webhookToken: secrets.relayWebhookTokenTest2,
  },
  {
    msgPrefix: '测试tl：',
    usePrefix: true,
    platform: 'telegram',
    channelId: '-610545261',
    botId: secrets.telegramIdTest,
  },
  {
    msgPrefix: '测试Q群：',
    usePrefix: true,
    platform: 'onebot',
    channelId: secrets.onebotId === '177564630' ? '733844993' : '927248735',
    botId: secrets.onebotId2,
  },
];

const linksConfig = [];
linksConfig.push(relayDCTest);
if (!isDev) linksConfig.push(relayONIWiki);

// const mediawikiConfig: WikiConfig = {
//   defaultApiPrivate: 'https://oni.fandom.com/zh/api.php',
//   defaultFlag: WikiFlags.infoboxDetails | WikiFlags.searchNonExist,
// };

// const bDynamicConfig: BDConfig = {};

export default defineConfig({
  port: isDev ? 8082 : 8080,
  nickname: ['ONIChat'],
  plugins: {
    'adapter-onebot': {
      protocol: 'ws',
      // 对应 cqhttp 配置项 ws_config.port
      endpoint: secrets.onebotServer,
      selfId: isDev ? secrets.onebotId2 : secrets.onebotId,
      token: isDev ? secrets.onebotToken2 : secrets.onebotId,
    },
    'adapter-discord': dcConfig,
    'adapter-telegram': {
      pollingTimeout: true,
      // selfUrl:
      //   'https://ec2-52-221-187-237.ap-southeast-1.compute.amazonaws.com:' +
      //   (isDev ? 8443 : 443),
      token: isDev ? secrets.telegramTokenTest : secrets.telegramTokenTest,
    },
    'database-mysql': {
      host: secrets.mysqlHost,
      // Koishi 服务器监听的端口
      port: secrets.mysqlPort,
      user: secrets.mysqlUser,
      password: secrets.mysqlPassword,
      database: isDev ? 'koishi_v4_test' : 'koishi_v4',
    },
    admin: {},
    common: {
      onRepeat: {
        minTimes: 3,
        probability: 0.5,
      },
      onFriendRequest: true,
    },
    // github: {},
    teach: {
      prefix: '#',
      authority: { regExp: 2 },
    },
    // console: {},
    // manager: {},
    // status: {},
    echo: {},
    chat: {},
    switch: {},
    'assets-smms': { token: secrets.smmsToken },
    // puppeteer: {
    //   browser: { executablePath: chromePath },
    // },
    // 'koishi-plugin-mediawiki': mediawikiConfig,
    // '../../packages/koishi-plugin-bdynamic/src/index': bDynamicConfig,
    './plugins/rssPlus': {},
    blive: {},
    './plugins/party-line-phone': {
      links: linksConfig,
    },
  },
  autoAssign: false,
  autoAuthorize: 1,
  prefix: ['.', '。'],
  watch: {
    // root: 'src', // 要监听的根目录，相对于工作路径
    // 要忽略的文件列表，支持 glob patterns
    ignored: ['*.log'],
  },
  logger: {
    levels: {
      base: 2,
      rss: 3,
    },
    showTime: true,
  },
});
