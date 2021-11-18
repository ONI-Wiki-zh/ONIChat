// From https://github.com/Wjghj-Project/Chatbot-SILI/blob/master/core/src/modules/discordLink.js

import { Context, Session, Bot } from "koishi";
import { Logger, segment } from "koishi-utils";
import { DiscordBot } from "koishi-adapter-discord";
import { } from "koishi-adapter-onebot";

const logger = new Logger('bDynamic');

type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

type QQConfigStrict = {
  platform: "onebot",
  usePrefix: true,
  msgPrefix: string,
  channelId: string,
  botId: string,
}
export type QQConfig = Optional<QQConfigStrict, "msgPrefix">

type DiscordConfigStrict = {
  platform: "discord",
  usePrefix: boolean,
  msgPrefix: string,
  channelId: string,
  botId: string,
  webhookID: string,
  webhookToken: string,
}
export type DiscordConfig = Optional<DiscordConfigStrict, "msgPrefix" | "usePrefix">
const ptConfigDefault = {
  onebot: {
    platform: "onebot",
    msgPrefix: "[QQ]",
    usePrefix: true,
  },
  discord: {
    platform: "discord",
    msgPrefix: "[DC]",
    usePrefix: false,
  }
}

export type LinkConfig = (QQConfig | DiscordConfig)[]
export type Config = {
  links: LinkConfig[];
}

export function apply(ctx: Context, config: Config) {
  config.links = config.links.filter(l => l.length >= 2)
  const webhookIDs: string[] = config
    .links
    .flatMap(link => {
      const ids: string[] = []
      for (const channel of link) {
        if (channel.platform == "discord")
          ids.push(channel.webhookID)
      }
      return ids
    })
  ctx   // 不响应转发的DC消息（有些还是过滤不掉所以后面有重新检测）
    .middleware((session, next) => {
      if (session.platform == "discord")
        if (webhookIDs.includes(session.author.userId)) return
      return next()
    }, true /* true 表示这是前置中间件 */)

  const prefixs: string[] = config
    .links
    .flatMap(link => link.map(channel =>
      channel.msgPrefix || ptConfigDefault[channel.platform].msgPrefix)
    )

  config.links.forEach((linked) => {
    linked.forEach((partialChannelConf, i) => {
      const channelPlatform: string = partialChannelConf.platform
      const channelConf: QQConfigStrict | DiscordConfigStrict = {
        ...ptConfigDefault[channelPlatform],
        ...partialChannelConf
      }
      const destinations: (QQConfigStrict | DiscordConfigStrict)[] = linked
        .filter((_, j) => i !== j)
        .map(d => ({ ...ptConfigDefault[d.platform], ...d }))

      switch (channelPlatform) {
        case "onebot":
          ctx // QQ 收到消息
            .platform('onebot' as never)
            .channel(channelConf.channelId)
            .on('message', (session) => {
              destinations.forEach(dest => {
                if (dest.platform === "onebot")
                  qq2qq(ctx, session, dest, channelConf.msgPrefix, prefixs)
                else
                  qq2dc(ctx, session, dest, channelConf.msgPrefix, prefixs)
              })
            })
          ctx // QQ 自己发消息
            .platform('onebot' as never)
            .channel(channelConf.channelId)
            .on('send', (session) => {
              destinations.forEach(dest => {
                if (dest.platform === "onebot")
                  qq2qq(ctx, session, dest, channelConf.msgPrefix, prefixs);
                else
                  qq2dc(ctx, session, dest, channelConf.msgPrefix, prefixs);

              })
            })
          break;
        case "discord":
          ctx // Discord 收到消息
            .platform('discord' as never)
            .channel(channelConf.channelId)
            .on('message', (session) => {
              destinations.forEach(dest => {
                if (dest.platform === "onebot")
                  dc2qq(ctx, session, dest, channelConf.msgPrefix, webhookIDs)
                else
                  dc2dc(ctx, session, dest, channelConf.msgPrefix, webhookIDs);
              })
            })
          ctx // Discord 自己发消息
            .platform('discord' as never)
            .channel(channelConf.channelId)
            .on('send', (session) => {
              destinations.forEach(dest => {
                if (dest.platform === "onebot")
                  dc2qq(ctx, session, dest, channelConf.msgPrefix, webhookIDs)
                else
                  dc2dc(ctx, session, dest, channelConf.msgPrefix, webhookIDs);
              })
            })
          break;
      }
    }
    )
    logger.success(linked.map(c => `${c.platform}:${c.channelId}`).join(" ⇿ "))
  })
}

function resolveBrackets(s: string): string {
  return s
    .replace(new RegExp('&#91;', 'g'), '[')
    .replace(new RegExp('&#93;', 'g'), ']')
    .replace(new RegExp('&amp;', 'g'), '&')
}

function dc2qq(ctx: Context, session: Session, config: QQConfigStrict, msgPrefix: string, webhookIDs: string[]) {
  if (webhookIDs.includes(session.author.userId)) return
  if (/(%disabled%|__noqq__)/i.test(session.content)) return
  if (/^\[qq\]/i.test(session.content)) return

  let content = session.content
  const sender = `${session.author.nickname ||
    session.author.username}#${session.author.discriminator || '0000'}`

  let msg = `${msgPrefix} ${sender}：\n${content}`
  logger.info('⇿', 'Discord 信息已推送到 QQ', sender, session.content)
  ctx.broadcast(['onebot:' + config.channelId], msg)
}

async function qq2qq(ctx: Context, session: Session.Payload<"message", any>, config: QQConfigStrict, msgPrefix: string, prefixs: string[]) {
  const content = session.content
  // 不转发转发的消息
  if (session.author.isBot !== false && prefixs.some(p => content.startsWith(p))) return
  const sender: string = `${session.author.username || ""}（${session.author.userId || "unknown"}）`
  const prefix = config.usePrefix ? msgPrefix : ""
  ctx.broadcast([`onebot:${config.channelId}`], `${prefix}${sender}：\n${content}`)
  logger.info('⇿', `${msgPrefix} 信息已推送到 ${config.msgPrefix}`, sender, session.content)
}

async function qq2dc(ctx: Context, session: Session, config: DiscordConfigStrict, msgPrefix: string, prefixs: string[]) {
  let message = session.content

  const prefix = config.usePrefix ? msgPrefix : ""
  message = resolveBrackets(message)

  // 不转发转发的消息
  if (session.author.isBot !== false && prefixs.some(p => message.startsWith(p))
    || /__nodc__/gi.test(message)) return

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
  send = prefix + send

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
    logger.info('⇿', `${msgPrefix} 信息已推送到 ${config.msgPrefix}`, nickname, send)
  } else {
    logger.warn('没有可用的 Discord 机器人', nickname, send)
  }
}

function dc2dc(ctx: Context, session: Session, config: DiscordConfigStrict, msgPrefix: string, webhookIDs: string[]) {
  if (webhookIDs.includes(session.author.userId)) return
  const prefix = config.usePrefix ? msgPrefix : ""

  // 安全性问题
  const content: string = session.content
    .replace(/(?<!\\)@everyone/g, '\\@everyone')
    .replace(/(?<!\\)@here/g, '\\@here')

  const author = session.author.nickname || session.author.username
  const name = prefix + author
  sendDC(ctx, config, name, session.author.avatar, content)
}

function sendDC(ctx: Context, config: DiscordConfigStrict, username, avatar_url, content) {
  const bot = ctx.channel(config.channelId).getBot('discord', config.botId) as unknown as DiscordBot
  if (bot) {
    bot
      .$executeWebhook(config.webhookID, config.webhookToken, {
        content,
        username,
        avatar_url,
      }, true)
      .then((msgId) => {
        logger.info('⇿', `${msgId} 消息已推送到 ${config.msgPrefix}`, username, content)
      })
      .catch((err) => {
        logger.warn(`推送到 ${config.channelId} 失败：`, username, content, err)
      })
  } else {
    logger.warn('转发消息时没有可用的 Discord 机器人', username, content)
  }
}