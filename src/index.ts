import { App, AppConfig } from 'koishi';
import 'koishi-adapter-discord';
import 'koishi-adapter-onebot';
import { apply as mysql } from 'koishi-plugin-mysql';
import { apply as common } from 'koishi-plugin-common';
import { apply as assets } from 'koishi-plugin-assets';
import { apply as teach } from 'koishi-plugin-teach';
import { apply as webui } from 'koishi-plugin-webui';
import { apply as tools } from 'koishi-plugin-tools';
import { apply as chat } from 'koishi-plugin-chat';
import { apply as mediawiki } from './plugins/mediawiki';
import { apply as rss } from './plugins/rssPlus';
import { apply as partyLinePhone, LinkConfig } from './plugins/partyLinePhone';
import { apply as blive } from 'koishi-plugin-blive';
import { apply as bDynamic } from './plugins/bdynamic';
// import { apply as bDynamic } from 'koishi-plugin-bdynamic'
// import { apply as bDynamic } from '../koishi-plugin-bdynamic/src/index'
import secrets from './secrets';
const isDev = process.env.NODE_ENV !== 'production';
console.log(isDev ? 'Development mode!' : 'Production mode');

const config: AppConfig = {
  // Koishi 服务器监听的端口
  port: isDev ? 8090 : 8080,
  nickname: ['ONIChat'],
  onebot: {
    secret: '',
  },
  bots: [
    {
      type: 'discord',
      token: isDev ? secrets.discordTokenTest : secrets.discordToken,
    },
  ],
  plugins: {
    './plugins/mediawiki.ts': {},
    './plugins/rss-plus.ts': {},
  },
  // 一旦收到来自未知频道的消息，就自动注册频道数据，代理者为收到消息的人
  autoAssign: true,
  // 一旦收到来自未知用户的消息，就自动注册用户数据，权限等级为 1
  autoAuthorize: 1,
  prefix: ['.', '。'],
  logLevel: {
    base: isDev ? 3 : 2,
    rss: 3,
  },
  watch: {
    // 要监听的根目录，相对于工作路径
    root: 'src',
    // 要忽略的文件列表，支持 glob patterns
    ignored: [],
  },
};
if (!isDev && config.bots) {
  config.bots.push({
    type: 'onebot:ws',
    // 对应 cqhttp 配置项 ws_config.port
    server: secrets.onebotServer,
    selfId: secrets.onebotId,
    token: secrets.onebotToken,
  });
}

const app = new App(config);

app.plugin(mysql, {
  host: secrets.mysqlHost,
  // Koishi 服务器监听的端口
  port: secrets.mysqlPort,
  user: secrets.mysqlUser,
  password: secrets.mysqlPassword,
  database: isDev ? 'koishi_test' : 'koishi',
});
app.plugin(common, {
  onRepeat: {
    minTimes: 3,
    probability: 0.5,
  },
});
app.plugin(assets, {
  type: 'smms',
  // sm.ms 的访问令牌
  token: secrets.smmsToken,
});
app.plugin(teach, {
  prefix: '#',
  authority: {
    regExp: 2,
  },
});
app.plugin(webui, {});
app.plugin(tools, {});
app.plugin(chat, {});
app.plugin(mediawiki, {});
app.plugin(rss, {});
app.plugin(blive, { subscriptions: {} });
app.plugin(bDynamic, {});

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
    botId: secrets.discordId,
    webhookID: secrets.relayWebhookID,
    webhookToken: secrets.relayWebhookToken,
  },
];

const relayUncle: LinkConfig = [
  {
    platform: 'onebot',
    usePrefix: true,
    msgPrefix: '【一群】',
    channelId: '1093380367',
    botId: secrets.onebotId,
  },
  {
    platform: 'onebot',
    usePrefix: true,
    msgPrefix: '【二群】',
    channelId: '801547821',
    botId: secrets.onebotId,
  },
];

const relayDCTest: LinkConfig = [
  {
    platform: 'discord',
    channelId: '910867818780692480',
    botId: secrets.discordIdTest,
    webhookID: secrets.relayWebhookID,
    webhookToken: secrets.relayWebhookToken,
  },
  {
    platform: 'discord',
    channelId: '910867837537644564',
    botId: secrets.discordIdTest,
    webhookID: secrets.relayWebhookID,
    webhookToken: secrets.relayWebhookToken,
  },
];

app.plugin(partyLinePhone, {
  links: isDev ? [relayDCTest] : [relayONIWiki, relayUncle],
});

app.start().then(() => {
  console.log('🌈', 'Koishi 启动成功');
});
