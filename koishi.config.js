// 配置项文档：https://koishi.js.org/api/app.html
let secrets = require('secrets.js')
module.exports = {
  // Koishi 服务器监听的端口
  port: 8080,
  bots: [{
    type: 'discord',
    token: secrets.discordToken,
  }],
  plugins: {
    common: {},
    github: {},
    webui: {},
  },
}
