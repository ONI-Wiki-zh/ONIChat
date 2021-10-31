// From https://github.com/Wjghj-Project/Chatbot-SILI/blob/master/core/src/modules/discordLink.js

import { Context, Session } from "koishi";
import { Logger, segment } from "koishi-utils";
import { } from "koishi-adapter-discord";
import { } from "koishi-adapter-onebot";

export interface Config {
  links?: [{ qq: string, discord: string }];
}

const logger = new Logger("discordLink");


export function apply(ctx: Context, config: Config = {}) {
  config.links.forEach((e) => {
    const { qq, discord } = e
    // QQ 收到消息
    ctx
      .platform('onebot' as never)
      .group(qq)
      .on('message', (session) => {
        qqToDiscord(ctx, session, discord)
      })
    // // QQ 自己发消息
    // ctx
    //   .platform('onebot' as never)
    //   .group(qq)
    //   .on('send', (session) => {
    //     qqToDiscord(ctx, session, discord)
    //   })

    // Discord 收到消息
    ctx
      .platform('discord' as never)
      .channel(discord)
      .on('message', (session) => {
        discordToQQ(ctx, session, qq)
      })


    // // Discord 自己发消息
    // ctx
    //   .platform('discord' as never)
    //   .channel(discord)
    //   .on('send', (session) => {
    //     discordToQQ(ctx, session, qq)
    //   })
  })
}

function resolveBrackets(s: string): string {
  return s
    .replace(new RegExp('&#91;', 'g'), '[')
    .replace(new RegExp('&#93;', 'g'), ']')
    .replace(new RegExp('&amp;', 'g'), '&')
}

function discordToQQ(ctx: Context, session: Session, channelId: string) {
  if (/(%disabled%|__noqq__)/i.test(session.content)) return
  if (/^\[qq\]/i.test(session.content)) return

  let content = session.content
  const sender = `${session.author.nickname ||
    session.author.username}#${session.author.discriminator || '0000'}`

  let msg = `[Discord] ${sender}：${content}`
  logger.debug('⇿', 'Discord信息已推送到QQ', sender, session.content)
  ctx.broadcast(['onebot:' + channelId], msg)
}

async function qqToDiscord(ctx: Context, session: Session, channelId: string) {
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
  send = send.replace(/@everyone/g, '@ everyone').replace(/@here/g, '@ here')

  let nickname = ''
  let id = session.author.userId
  nickname +=
    session?.author?.username ||
    '[UNKNOWN_USER_NAME]'
  nickname += ' (' + id + ')'

  ctx.broadcast(['discord:' + channelId], nickname + ": " + send)
  logger.debug('⇿', 'QQ消息已推送到Discord')
}