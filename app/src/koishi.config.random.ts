import { defineConfig } from '@koishijs/cli';
import { BotConfig as DCConfig } from '@koishijs/plugin-adapter-discord';
import {} from '@koishijs/plugin-adapter-onebot';
// import {} from '@koishijs/plugin-adapter-telegram';
import {} from '@koishijs/plugin-admin';
import {} from '@koishijs/plugin-chat';
import {} from '@koishijs/plugin-console';
import {} from '@koishijs/plugin-database-mysql';
import {} from '@koishijs/plugin-manager';
import {} from '@koishijs/plugin-status';
import {} from '@koishijs/plugin-switch';
import {} from '@koishijs/plugin-teach';
// import {
//   Config as WikiConfig,
//   Flags as WikiFlags,
// } from '../../packages/koishi-plugin-mediawiki/src/index';
import { BotConfig as MCConfig } from '../../packages/koishi-plugin-adapter-minecraft/src/index';
import { LinkConfig } from './plugins/party-line-phone';
import secrets from './secrets';

const dcConfig: DCConfig = {
  token: secrets.discordTokenTest,
};

const relayMC: LinkConfig = [
  {
    msgPrefix: '【犽之谷】',
    platform: 'minecraft',
    usePrefix: true,
    channelId: '_public',
    botId: 'DDEle',
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

// const mediawikiConfig: WikiConfig = {
//   defaultApiPrivate: 'https://minecraft.fandom.com/zh/api.php',
//   defaultFlag: WikiFlags.infoboxDetails | WikiFlags.searchNonExist,
// };

const linksConfig = [relayMC];

const mcConfig: MCConfig = {
  host: 'server.vcraft.top',
  username: secrets.yallage.mcUsername,
  password: secrets.yallage.mcPassword,
  // auth: 'mcleaks',
  version: '1.16.5',
  rateLimit: 300,
  authServer: 'https://login.yallage.com/api/yggdrasil/authserver',
  sessionServer: 'https://login.yallage.com/api/yggdrasil/sessionserver',
  author: {
    username: '犽之谷',
    userId: '_',
    avatar:
      'https://static.wikia.nocookie.net/minecraft_gamepedia/images/b/b7/Crafting_Table_JE4_BE3.png',
  },
  skipValidation: false,
};

const conf = defineConfig({
  // Wait until it has access control
  host: '0.0.0.0',
  port: 8084,
  nickname: ['yallage'],
  plugins: {
    'adapter-discord': dcConfig,
    // '../../packages/koishi-plugin-adapter-minecraft/src/index': mcConfig,
    '../../packages/koishi-plugin-mwrc/src/index': {},
    'database-mysql': {
      host: secrets.mysqlHost,
      // Koishi 服务器监听的端口
      port: secrets.mysqlPort,
      user: secrets.mysqlUser,
      password: secrets.mysqlPassword,
      database: 'koishi_v4_test',
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
    // manager: {},
    // status: {},
    // chat: {},
    // switch: {},
    // './plugins/party-line-phone': { links: linksConfig },
    // '../../packages/koishi-plugin-mediawiki/src/index': mediawikiConfig,
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
    levels: {
      base: 3,
      rss: 3,
    },
    showTime: true,
  },
});
export default conf;
