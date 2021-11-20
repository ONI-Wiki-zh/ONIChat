import { App, AppConfig } from 'koishi';
import 'koishi-adapter-onebot';
import { apply as mysql } from 'koishi-plugin-mysql';
import { apply as partyLinePhone, LinkConfig } from './plugins/partyLinePhone';
import secrets from './secrets';

const relayConfig: AppConfig = {
  port: 9078,
  autoAssign: true,
  autoAuthorize: 1,
  prefix: [secrets.onebotToken2], // no command
  bots: [
    {
      type: 'onebot:ws',
      // 对应 cqhttp 配置项 ws_config.port
      server: secrets.onebotServer2,
      selfId: secrets.onebotId2,
      token: secrets.onebotToken2,
    },
  ],
  logLevel: 2,
  logTime: true,
  help: false,
};
const appRelay = new App(relayConfig);

appRelay.plugin(mysql, {
  host: secrets.mysqlHost,
  // Koishi 服务器监听的端口
  port: secrets.mysqlPort,
  user: secrets.mysqlUser,
  password: secrets.mysqlPassword,
  database: 'koishi_relay',
});
const relayUncle: LinkConfig = [
  {
    platform: 'onebot',
    usePrefix: true,
    msgPrefix: '【一群】',
    channelId: '1093380367',
    botId: secrets.onebotId2,
  },
  {
    platform: 'onebot',
    usePrefix: true,
    msgPrefix: '【二群】',
    channelId: '801547821',
    botId: secrets.onebotId2,
  },
];
appRelay.plugin(partyLinePhone, {
  links: [relayUncle],
});

appRelay.start().then(() => {
  console.log('🌈', '转发机器人启动成功');
});
