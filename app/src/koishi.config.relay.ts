import { defineConfig } from '@koishijs/cli';
import {} from '@koishijs/plugin-adapter-discord';
import {} from '@koishijs/plugin-adapter-onebot';
import {} from '@koishijs/plugin-adapter-telegram';
import {} from '@koishijs/plugin-chat';
import {} from '@koishijs/plugin-console';
import {} from '@koishijs/plugin-database-mysql';
import {} from '@koishijs/plugin-manager';
import {} from '@koishijs/plugin-puppeteer';
import {} from '@koishijs/plugin-status';
import {} from '@koishijs/plugin-teach';
import { LinkConfig } from './plugins/party-line-phone';
import secrets from './secrets';

const relayUncle: LinkConfig = [
  {
    atOnly: true,
    platform: 'onebot',
    usePrefix: true,
    msgPrefix: '【一群】',
    channelId: '1093380367',
    botId: secrets.onebotId2,
  },
  {
    atOnly: true,
    platform: 'onebot',
    usePrefix: true,
    msgPrefix: '【二群】',
    channelId: '801547821',
    botId: secrets.onebotId2,
  },
];

export default defineConfig({
  port: 9078,
  nickname: ['共线电话'],
  prefix: [secrets.onebotToken2], // no command
  plugins: {
    'adapter-onebot': {
      protocol: 'ws',
      endpoint: secrets.onebotServer2,
      selfId: secrets.onebotId2,
      token: secrets.onebotToken2,
    },
    'database-mysql': {
      host: secrets.mysqlHost,
      // Koishi 服务器监听的端口
      port: secrets.mysqlPort,
      user: secrets.mysqlUser,
      password: secrets.mysqlPassword,
      database: 'koishi_v4_relay',
    },
    './plugins/party-line-phone': {
      links: [relayUncle],
    },
  },
  autoAssign: true,
  autoAuthorize: 1,
  watch: {
    // root: 'src', // 要监听的根目录，相对于工作路径
    // 要忽略的文件列表，支持 glob patterns
    ignored: ['*.log'],
  },
  help: false,
});
