// From https://github.com/Wjghj-Project/Chatbot-SILI/blob/master/core/src/modules/discordLink.js

import { Context, Session, Bot } from "koishi";
import { Logger, segment } from "koishi-utils";
import { DiscordBot } from "koishi-adapter-discord";
import { } from "koishi-adapter-onebot";

export interface QQConfig {
  channelId: string,
  botId: string,
}

export interface DiscordConfig {
  channelId: string,
  botId: string,
  webhookID: string,
  webhookToken: string,
}

export interface Config {
  links?: [{
    qq: QQConfig,
    discord: DiscordConfig,
  }];
}

const logger = new Logger("discordLink");


export function apply(ctx: Context, config: Config = {}) {
  config.links.forEach(({ qq, discord }) => {
    ctx // QQ 收到消息
      .platform('onebot' as never)
      .channel(qq.channelId)
      .on('message', (session) => {
        qqToDiscord(ctx, session, discord)
      })
    ctx // QQ 自己发消息
      .platform('onebot' as never)
      .channel(qq.channelId)
      .on('send', (session) => {
        qqToDiscord(ctx, session, discord)
      })

    ctx // Discord 收到消息
      .platform('discord' as never)
      .channel(discord.channelId)
      .on('message', (session) => {
        logger.warn(config.links.map(c => c.discord.webhookID))
        logger.warn(session.author.userId)
        if (config.links.map(c => c.discord.webhookID).includes(session.author.userId))
          return
        discordToQQ(ctx, session, qq)
      })

    ctx // Discord 自己发消息
      .platform('discord' as never)
      .channel(discord.channelId)
      .on('send', (session) => {
        discordToQQ(ctx, session, qq)
      })
  })
}

function resolveBrackets(s: string): string {
  return s
    .replace(new RegExp('&#91;', 'g'), '[')
    .replace(new RegExp('&#93;', 'g'), ']')
    .replace(new RegExp('&amp;', 'g'), '&')
}

function discordToQQ(ctx: Context, session: Session, config: QQConfig) {
  if (/(%disabled%|__noqq__)/i.test(session.content)) return
  if (/^\[qq\]/i.test(session.content)) return

  let content = session.content
  const sender = `${session.author.nickname ||
    session.author.username}#${session.author.discriminator || '0000'}`

  let msg = `[Discord] ${sender}：${content}`
  logger.debug('⇿', 'Discord信息已推送到QQ', sender, session.content)
  ctx.broadcast(['onebot:' + config.channelId], msg)
}

async function qqToDiscord(ctx: Context, session: Session, config: DiscordConfig) {
  let message = session.content
  message = resolveBrackets(message)
  if (/^\[discord\]/i.test(message) || /__nodc__/gi.test(message)) return

  let send = ''
  if (/\[cq:image,.+\]/gi.test(message)) {
    let image = message.replace(
      /(.*?)\[cq:image.+,url=(.+?)\](.*?)/gi,
      '$1 $2 $3'
    )
    send += image
  } else {
    send += message
  }
  send = send.replace(/\[cq:at,qq=(.+?)\]/gi, '`@$1`')

  if (/\[cq:reply.+\]/i.test(message)) {
    let replyMsg = ''
    const replySeg = segment.parse(/\[cq:reply.+?\]/i.exec(message)[0])
    const replyId = replySeg?.[0]?.data?.id || ''
    const replyMeta = await session.bot.getMessage(session.channelId, replyId)

    let replyTime = new Date(replyMeta.timestamp),
      replyDate = `${replyTime.getHours()}:${replyTime.getMinutes()}`

    replyMsg = replyMeta.content
    replyMsg = resolveBrackets(replyMsg)
    replyMsg = replyMsg.split('\n').join('\n> ')
    replyMsg = '> ' + replyMsg + '\n'
    replyMsg =
      `> **__回复 ${replyMeta.author.nickname ||
      replyMeta.author.username} 在 ${replyDate} 的消息__**\n` + replyMsg
    send = send.replace(/\[cq:reply.+?\]/i, replyMsg)
  }

  // 安全性问题
  send = send.replace(/(?<!\\)@everyone/g, '\\@everyone').replace(/(?<!\\)@here/g, '\\@here')

  let nickname = ''
  let id = session.author.userId
  nickname +=
    session?.author?.username ||
    '[UNKNOWN_USER_NAME]'
  nickname += ' (' + id + ')'

  const bot = ctx
    .bots
    .filter(b => b.platform == 'discord' && b.selfId == config.botId)[0]

  if (bot?.platform == 'discord') {
    const t = await (bot as unknown as DiscordBot)?.$executeWebhook(config.webhookID, config.webhookToken, {
      content: send,
      username: nickname,
      avatar_url: `http://q1.qlogo.cn/g?b=qq&nk=${id}&s=640`,
    }, true)
    logger.warn(t)
  }

  logger.debug('⇿', 'QQ消息已推送到Discord', nickname, send)
}