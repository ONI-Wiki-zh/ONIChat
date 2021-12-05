import fs from 'fs';
import { AppConfig } from 'koishi';
import {} from 'koishi-plugin-assets';
import {} from 'koishi-plugin-bdynamic';
import {} from 'koishi-plugin-blive';
import {} from 'koishi-plugin-chat';
import {} from 'koishi-plugin-common';
import {} from 'koishi-plugin-mediawiki';
import {} from 'koishi-plugin-mysql';
import {} from 'koishi-plugin-puppeteer';
import {} from 'koishi-plugin-teach';
import {} from 'koishi-plugin-tools';
import {} from 'koishi-plugin-webui';
import { LinkConfig } from './plugins/partyLinePhone';
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

const config: AppConfig = {
  // Koishi 服务器监听的端口
  port: isDev ? 8082 : 8080,
  nickname: ['ONIChat'],
  telegram: {
    selfUrl:
      'https://ec2-52-221-187-237.ap-southeast-1.compute.amazonaws.com:' +
      (isDev ? 8443 : 443),
  },
  bots: [
    {
      type: 'discord',
      token: isDev ? secrets.discordTokenTest : secrets.discordToken,
    },
    {
      type: 'telegram',
      token: isDev ? secrets.telegramTokenTest : secrets.telegramToken,
    },
  ],
  plugins: {
    mysql: {
      host: secrets.mysqlHost,
      // Koishi 服务器监听的端口
      port: secrets.mysqlPort,
      user: secrets.mysqlUser,
      password: secrets.mysqlPassword,
      database: isDev ? 'koishi_test' : 'koishi',
    },
    common: {
      onRepeat: {
        minTimes: 3,
        probability: 0.5,
      },
      onFriendRequest: true,
    },
    assets: {
      type: 'smms',
      token: secrets.smmsToken, // sm.ms 的访问令牌
    },
    teach: {
      prefix: '#',
      authority: { regExp: 2 },
    },
    webui: {},
    tools: {},
    chat: {},
    puppeteer: {
      browser: { executablePath: chromePath },
    },
    './plugins/rssPlus': {},
    blive: {},
    bDynamic: {},
    './plugins/partyLinePhone': {
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
  logTime: true,
  logLevel: {
    base: 2,
    rss: 3,
    wiki: 3,
  },
};

if (config.bots) {
  if (!isDev)
    config.bots.push({
      type: 'onebot:ws',
      // 对应 cqhttp 配置项 ws_config.port
      server: secrets.onebotServer,
      selfId: secrets.onebotId,
      token: secrets.onebotToken,
    });
  else
    config.bots.push({
      type: 'onebot:ws',
      // 对应 cqhttp 配置项 ws_config.port
      server: secrets.onebotServer,
      selfId: secrets.onebotId2,
      token: secrets.onebotToken2,
    });
}

export default config;
