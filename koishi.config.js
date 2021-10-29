let secrets = require('./secrets')

// 配置项文档：https://koishi.js.org/api/app.html
module.exports = {
  // Koishi 服务器监听的端口
  port: 8080,
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
    mysql: {
      host: secrets.mysqlHost,
      // Koishi 服务器监听的端口
      port: secrets.mysqlPort,
      user: secrets.mysqlUser,
      password: secrets.mysqlPassword,
      database: 'koishi',
    },
    common: {},
    teach: {},
    // webui: {},
  },
  // 一旦收到来自未知频道的消息，就自动注册频道数据，代理者为收到消息的人
  autoAssign: true,
  // 一旦收到来自未知用户的消息，就自动注册用户数据，权限等级为 1
  autoAuthorize: 1,
}
