import {} from '@koishijs/cli';
import { BotConfig as DCConfig } from '@koishijs/plugin-adapter-discord';
import { BotConfig as OnebotConfig } from '@koishijs/plugin-adapter-onebot';
// import {} from '@koishijs/plugin-adapter-telegram';
import {} from '@koishijs/plugin-admin';
import {} from '@koishijs/plugin-chat';
import {} from '@koishijs/plugin-console';
import {} from '@koishijs/plugin-database-mysql';
import {} from '@koishijs/plugin-logger';
import {} from '@koishijs/plugin-manager';
import puppeteer from '@koishijs/plugin-puppeteer';
import {} from '@koishijs/plugin-rate-limit';
import {} from '@koishijs/plugin-status';
import {} from '@koishijs/plugin-teach';
import fs from 'fs';
import { defineConfig, Logger } from 'koishi';
// import { BotConfig as MCConfig } from 'koishi-plugin-adapter-minecraft';
import smms from 'koishi-plugin-assets-smms';
import {} from 'koishi-plugin-bdynamic';
import { Config as WikiConfig } from 'koishi-plugin-mediawiki';
import { ConfigObject as GosenConfig } from './plugins/gosen-choyen';
import { LinkConfig } from './plugins/party-line-phone';
import secrets from './secrets';

const isDev = process.env.NODE_ENV !== 'production';
new Logger('').success(isDev ? 'Development mode!' : 'Production mode');

let chromePath = `C:/Program Files/Google/Chrome/Application/chrome.exe`;
if (!fs.existsSync(chromePath)) chromePath = '/usr/bin/google-chrome-stable';
const puppeteerConfig: puppeteer.Config = {
  browser: { executablePath: chromePath },
};

const dcConfig: DCConfig = {
  token: secrets.yallage.discordToken,
};
const onebotConfig: OnebotConfig = {
  protocol: 'ws',
  // 对应 cqhttp 配置项 ws_config.port
  endpoint: secrets.yallage.onebotServer,
  selfId: isDev ? secrets.yallage.onebotIdT1 : secrets.yallage.onebotId,
  token: secrets.yallage.onebotToken,
};

const relay1Config: LinkConfig = [
  {
    msgPrefix: '【一群】',
    platform: 'onebot',
    usePrefix: true,
    channelId: '1130068931',
    botId: secrets.yallage.onebotId,
  },
  {
    // atOnly: true,
    msgPrefix: '【DC】',
    usePrefix: true,
    platform: 'discord',
    channelId: '932825716293255178',
    guildId: '888755372217753610',
    botId: secrets.yallage.discordId,
    webhookID: secrets.yallage.relayWebhookID1,
    webhookToken: secrets.yallage.relayWebhookToken1,
  },
];

const relay2Config: LinkConfig = [
  {
    msgPrefix: '【二群】',
    platform: 'onebot',
    usePrefix: true,
    channelId: '714245242',
    botId: secrets.yallage.onebotId,
  },
  {
    // atOnly: true,
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
    // atOnly: true,
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
    atOnly: true,
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

const relayMC: LinkConfig = [
  {
    msgPrefix: '【犽之谷】',
    platform: 'minecraft',
    usePrefix: true,
    channelId: '_public',
    botId: 'YA_BOT',
  },
  {
    msgPrefix: '【DC】',
    platform: 'discord',
    channelId: '930861949506441216',
    guildId: '888755372217753610',
    botId: secrets.yallage.discordId,
    webhookID: secrets.yallage.relayWebhookIDMC,
    webhookToken: secrets.yallage.relayWebhookTokenMC,
  },
];

const linksConfig = [relayTestConfig];
if (!isDev) linksConfig.push(relay1Config);
if (!isDev) linksConfig.push(relay2Config);
if (!isDev) linksConfig.push(relay3Config);
if (!isDev) linksConfig.push(relayMC);

const smmsConfig: smms.Config = {
  token: secrets.yallage.smmsToken,
};

const gosenConfig: GosenConfig = {
  upper: { path: './src/fonts/shsans_heavy.otf' },
  lower: { path: './src/fonts/shserif_heavy.otf' },
};

// const mcConfig: MCConfig = {
//   host: 'server.vcraft.top',
//   username: secrets.yallage.mcUsername,
//   password: secrets.yallage.mcPassword,
//   version: '1.16.5',
//   rateLimit: 300,
//   authServer: 'https://login.yallage.com/api/yggdrasil/authserver',
//   sessionServer: 'https://login.yallage.com/api/yggdrasil/sessionserver',
//   author: {
//     username: '犽之谷',
//     userId: '_',
//     avatar:
//       'https://static.wikia.nocookie.net/minecraft_gamepedia/images/b/b7/Crafting_Table_JE4_BE3.png',
//   },
//   skipValidation: false,
// };

const mediawikiConfig: WikiConfig = {
  defaultApi: {
    private: 'https://minecraft.fandom.com/zh/api.php',
  },
  defaultFlag: {
    searchNonExist: true,
    infoboxDetails: true,
  },
};
const conf = defineConfig({
  // Wait until it has access control
  // host: "0.0.0.0",
  port: 8084,
  nickname: ['yallage'],
  plugins: {
    'assets-smms': smmsConfig,
    './plugins/yallage': {},
    'adapter-onebot': {
      bots: [onebotConfig],
    },
    'adapter-discord': {
      request: { proxyAgent: 'socks://localhost:7890' },
      bots: [dcConfig],
    },
    // 'koishi-plugin-adapter-minecraft': mcConfig,
    'database-mysql': {
      host: secrets.mysqlHost,
      // Koishi 服务器监听的端口
      port: secrets.mysqlPort,
      user: secrets.mysqlUser,
      password: secrets.mysqlPassword,
      database: 'yallage_v4',
    },
    admin: {},
    echo: {},
    sudo: {},
    bind: {},
    callme: {},
    recall: {},
    feedback: {},
    // github: {},
    teach: {
      prefix: '#',
      authority: { regExp: 2 },
    },
    console: {},
    manager: {},
    'rate-limit': {},
    status: {},
    chat: {},
    switch: {},
    './plugins/party-line-phone': {
      recent: 100,
      links: linksConfig,
    },
    puppeteer: puppeteerConfig,
    logger: {},
    './plugins/hhsh': {},
    './plugins/gosen-choyen': gosenConfig,
    './plugins/auto-silent': {},
    // 'image-search': { saucenaoApiKey: [secrets.yallage.saucenaoApiKey] },
    mediawiki: mediawikiConfig,
    bdynamic: {},
    meme: {
      minInterval: 10000,
    },
    './plugins/cp': {},
  },
  autoAssign: true,
  autoAuthorize: 1,
  prefix: '.',
  watch: {
    // root: 'src', // 要监听的根目录，相对于工作路径
    // 要忽略的文件列表，支持 glob patterns
    ignored: ['*.log'],
  },
  logger: {
    // levels: {
    //   base: 2,
    //   rss: 3,
    // },
    showTime: true,
  },
});
export default conf;
