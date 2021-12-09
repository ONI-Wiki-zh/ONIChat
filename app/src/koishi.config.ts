import { defineConfig } from '@koishijs/cli';
import {} from '@koishijs/plugin-adapter-discord';
import {} from '@koishijs/plugin-adapter-onebot';
import {} from '@koishijs/plugin-adapter-telegram';
import {} from '@koishijs/plugin-chat';
import {} from '@koishijs/plugin-common';
import {} from '@koishijs/plugin-console';
import {} from '@koishijs/plugin-database-mysql';
import {} from '@koishijs/plugin-manager';
import {} from '@koishijs/plugin-puppeteer';
import {} from '@koishijs/plugin-status';
import {} from '@koishijs/plugin-github';
import {} from '@koishijs/plugin-teach';
import fs from 'fs';
// import {} from 'koishi-plugin-bdynamic';
import {} from 'koishi-plugin-blive';
import {
  Config as WikiConfig,
  Flags as WikiFlags,
} from 'koishi-plugin-mediawiki';
import { LinkConfig } from './plugins/party-line-phone';
import {} from './plugins/rssPlus';
import secrets from './secrets';

const isDev = process.env.NODE_ENV !== 'production';
console.log(isDev ? 'Development mode!' : 'Production mode');

let chromePath = `C:/Program Files/Google/Chrome/Application/chrome.exe`;
if (!fs.existsSync(chromePath)) chromePath = '';

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
];

const mediawikiConfig: WikiConfig = {
  defaultApiPrivate: 'https://oni.fandom.com/zh/api/php',
  defaultFlag: WikiFlags.infoboxDetails | WikiFlags.searchNonExist,
};

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
    'adapter-discord': {
      token: isDev ? secrets.discordTokenTest : secrets.discordToken,
    },
    'adapter-telegram': {
      protocol: 'polling',
      selfUrl:
        'https://ec2-52-221-187-237.ap-southeast-1.compute.amazonaws.com:' +
        (isDev ? 8443 : 443),
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
    common: {
      onRepeat: {
        minTimes: 3,
        probability: 0.5,
      },
      onFriendRequest: true,
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
    puppeteer: {
      browser: { executablePath: chromePath },
    },
    // 'koishi-plugin-mediawiki': mediawikiConfig,
    // './plugins/rssPlus': {},
    // blive: {},
    // bDynamic: {},
    './plugins/party-line-phone': {
      links: isDev ? [relayDCTest] : [relayONIWiki],
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
  // logLevel: {
  //   base: 2,
  //   rss: 3,
  //   wiki: 3,
  // },
});
