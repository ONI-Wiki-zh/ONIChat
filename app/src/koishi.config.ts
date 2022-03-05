import {} from '@koishijs/cli';
import { BotConfig as DCConfig } from '@koishijs/plugin-adapter-discord';
import { BotConfig as OnebotConfig } from '@koishijs/plugin-adapter-onebot';
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
import fs from 'fs';
import {} from 'koishi-plugin-assets-smms';
import {} from 'koishi-plugin-blive';
import { Config as BDConfig } from 'koishi-plugin-bdynamic';
import { Config as WikiConfig } from 'koishi-plugin-mediawiki';
import { Config as MemeConfig } from 'koishi-plugin-meme';
import { LinkConfig } from './plugins/party-line-phone';
import {} from './plugins/rssPlus';
import secrets from './secrets';
import { Time, defineConfig } from 'koishi';

const isDev = process.env.NODE_ENV !== 'production';
console.log(isDev ? 'Development mode!' : 'Production mode');

let chromePath = `C:/Program Files/Google/Chrome/Application/chrome.exe`;
if (!fs.existsSync(chromePath)) chromePath = '';

const dcConfig: DCConfig = {
  token: isDev ? secrets.discordTokenTest : secrets.discordToken,
};

const onebot: OnebotConfig[] = [
  {
    disabled: isDev,
    protocol: 'ws',
    // 对应 cqhttp 配置项 ws_config.port
    endpoint: secrets.onebotServer,
    selfId: secrets.onebotId,
    token: secrets.onebotToken,
  },
  {
    protocol: 'ws',
    // 对应 cqhttp 配置项 ws_config.port
    endpoint: secrets.onebotServer2,
    selfId: secrets.onebotId2,
    token: secrets.onebotToken2,
  },
];

const relayONIWiki: LinkConfig = [
  {
    platform: 'onebot',
    usePrefix: true,
    msgPrefix: '【Q群】',
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
  {
    platform: 'telegram',
    usePrefix: true,
    msgPrefix: '【TG】',
    channelId: '-1001709943276',
    botId: secrets.telegramId,
  },
  // {
  //   platform: 'onebot',
  //   usePrefix: true,
  //   msgPrefix: '【频道】',
  //   channelId: 'guild:10163911639023428-1740492',
  //   botId: secrets.onebotId,
  // },
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
// linksConfig.push(relayDCTest);
if (!isDev) linksConfig.push(relayONIWiki);

const mediawikiConfig: WikiConfig = {
  defaultApi: {
    private: 'https://oni.fandom.com/zh/api.php',
  },
  defaultFlag: {
    searchNonExist: true,
    infoboxDetails: true,
  },
};

const bDynamicConfig: BDConfig = {};

const meme: MemeConfig = {
  minInterval: 10 * Time.second,
  authority: {
    upload: 1,
    delete: 2,
    approve: 3,
  },
};

export default defineConfig({
  host: '0.0.0.0',
  port: isDev ? 8083 : 8081,
  nickname: ['ONIChat'],
  plugins: {
    'adapter-onebot': {
      bots: onebot,
    },
    'adapter-discord': dcConfig,
    'adapter-telegram': {
      pollingTimeout: true,
      // selfUrl:
      //   'https://ec2-52-221-187-237.ap-southeast-1.compute.amazonaws.com:' +
      //   (isDev ? 8443 : 443),
      token: isDev ? secrets.telegramTokenTest : secrets.telegramToken,
    },
    'database-mysql': {
      host: secrets.mysqlHost,
      // Koishi 服务器监听的端口
      port: secrets.mysqlPort,
      user: secrets.mysqlUser,
      password: secrets.mysqlPassword,
      database: isDev ? 'koishi_v4_test' : 'koishi_v4',
    },
    // github: {},
    admin: {},
    teach: {
      prefix: '#',
      authority: { regExp: 2 },
    },
    console: {
      // devMode: true,
    },
    manager: {},
    status: {},
    dataview: {},
    auth: {},
    echo: {},
    callme: {},
    bind: {},
    chat: {},
    recall: {},
    logger: {},
    switch: {},
    'assets-smms': { token: secrets.smmsToken },
    puppeteer: {
      browser: { executablePath: chromePath },
    },
    bdynamic: bDynamicConfig,
    blive: {},
    migrate: {},
    meme,
    'rate-limit': {},
    'koishi-plugin-mediawiki': mediawikiConfig,
    './plugins/rssPlus': {},
    './plugins/gosen-choyen': {
      upper: { path: './src/fonts/shsans_heavy.otf' },
      lower: { path: './src/fonts/shserif_heavy.otf' },
    },
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
