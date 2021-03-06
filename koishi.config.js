let secrets = require('./secrets')

// 配置项文档：https://koishi.js.org/api/app.html
module.exports = {
  // Koishi 服务器监听的端口
  port: 8080,
  nickname: ["ONIChat"],
  onebot: {
    secret: '',
  },
  bots: [{
    type: 'onebot:ws',
    // 对应 cqhttp 配置项 ws_config.port
    server: secrets.onebotServer,
    selfId: secrets.onebotId,
    token: secrets.onebotToken,
  },
  {
    type: 'discord',
    token: secrets.discordToken,
  }],
  plugins: {
    '@idlist/koishi-plugin-blive': {},
    './plugins/discordLink.ts': {
      links: [
        {
          qq: {
            channelId: "878046487",
            botId: secrets.onebotId,
          },
          discord: {
            channelId: "903611430895509504",
            botId: secrets.discordId,
            webhookID: secrets.relayWebhookID,
            webhookToken: secrets.relayWebhookToken,
          },
        },
      ]
    },
    mysql: {
      host: secrets.mysqlHost,
      // Koishi 服务器监听的端口
      port: secrets.mysqlPort,
      user: secrets.mysqlUser,
      password: secrets.mysqlPassword,
      database: 'koishi',
    },
    common: {
      onRepeat: {
        minTimes: 3,
        probability: 0.5,
      },
    },
    assets: {
      type: 'smms',
      // sm.ms 的访问令牌
      token: secrets.smmsToken,
    },
    teach: {
      prefix: '#',
      authority: {
        regExp: 2,
      },
    },
    webui: {},
    tools: {},
    chat: {},
    './plugins/mediawiki.ts': {},
    './plugins/rss-plus.ts': {},
  },
  // 一旦收到来自未知频道的消息，就自动注册频道数据，代理者为收到消息的人
  autoAssign: true,
  // 一旦收到来自未知用户的消息，就自动注册用户数据，权限等级为 1
  autoAuthorize: 1,
  prefix: [".", "。"],
  logLevel: {
    base: 2,
    rss: 3,
    discordLink: 3,
  },
  watch: {
    // 要监听的根目录，相对于工作路径
    root: 'plugins',
    // 要忽略的文件列表，支持 glob patterns
    ignore: [],
  },
}
