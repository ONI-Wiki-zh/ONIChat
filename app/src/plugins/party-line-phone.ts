// From https://github.com/Wjghj-Project/Chatbot-SILI/blob/master/core/src/modules/discordLink.js

import { DiscordBot, Sender } from '@koishijs/plugin-adapter-discord';
import {} from '@koishijs/plugin-adapter-onebot';
// import {} from 'koishi-plugin-adapter-minecraft';
// import { TelegramBot } from '@koishijs/plugin-adapter-telegram';
import { Bot, Context, Logger, segment, Session, Time } from 'koishi';
import { setInterval } from 'timers';
const logger = new Logger('partyLinePhone');

type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

type QQConfigStrict = {
  platform: 'onebot';
  atOnly: boolean;
  showId: boolean;
  badId: boolean;
  usePrefix: true;
  msgPrefix: string;
  channelId: string;
  botId: string;
};
export type QQConfig = Optional<
  QQConfigStrict,
  'msgPrefix' | 'atOnly' | 'showId' | 'badId'
>;

type DiscordConfigStrict = {
  platform: 'discord';
  atOnly: boolean;
  showId: boolean;
  badId: boolean;
  usePrefix: boolean;
  msgPrefix: string;
  channelId: string;
  guildId: string;
  botId: string;
  webhookID: string;
  webhookToken: string;
};
export type DiscordConfig = Optional<
  DiscordConfigStrict,
  'msgPrefix' | 'usePrefix' | 'atOnly' | 'showId' | 'badId'
>;

export type TLConfigStrict = {
  platform: 'telegram';
  atOnly: boolean;
  showId: boolean;
  badId: boolean;
  usePrefix: true;
  msgPrefix: string;
  channelId: string;
  botId: string;
};
export type TLConfig = Optional<
  TLConfigStrict,
  'msgPrefix' | 'atOnly' | 'showId' | 'badId'
>;

export type MCConfigStrict = {
  platform: 'minecraft';
  atOnly: boolean;
  showId: boolean;
  badId: boolean;
  usePrefix: true;
  msgPrefix: string;
  channelId: '_public';
  botId: string;
};
export type MCConfig = Optional<
  MCConfigStrict,
  'msgPrefix' | 'atOnly' | 'showId' | 'badId'
>;

const ptConfigDefault = {
  onebot: {
    platform: 'onebot',
    atOnly: false,
    showId: true,
    badId: false,
    msgPrefix: '[QQ]',
    usePrefix: true,
  },
  discord: {
    platform: 'discord',
    atOnly: false,
    showId: true,
    badId: false,
    msgPrefix: '[DC]',
    usePrefix: false,
  },
  telegram: {
    platform: 'telegram',
    atOnly: false,
    showId: true,
    badId: false,
    msgPrefix: '[TL]',
    usePrefix: true,
  },
  minecraft: {
    platform: 'minecraft',
    atOnly: false,
    showId: false,
    badId: true,
    msgPrefix: '[MC]',
    usePrefix: true,
  },
};

export type LinkConfig = (QQConfig | DiscordConfig | TLConfig | MCConfig)[];
export type channelConfigStrict =
  | QQConfigStrict
  | DiscordConfigStrict
  | TLConfigStrict
  | MCConfig;
export type LinkConfigStrict = channelConfigStrict[];
export type Config = {
  /**
   * number of recent messages kept in memory for reply and deletion
   * @defaultValue 1000
   */
  recent?: number;
  links: LinkConfig[];
};

/** Opposite to original message */
type RelayedMsgs = {
  channelId: string;
  botId: string;
  msgIds: string[];
}[];

/**
 * Recent message storage
 */
class RecentMsgs {
  // channelId => messageId => relayedMsgs
  msgs: Record<
    string,
    {
      recent: string[];
      record: Record<string, RelayedMsgs>;
    }
  > = {};

  // channelId => messageId => orig message
  msgMap: Record<string, Record<string, { channelId: string; msgId: string }>> =
    {};

  /**
   * ??????????????????????????????????????????
   * @param channelId ????????????????????????????????????
   * @param msgId ??????????????? id
   * @returns ????????????????????????????????????
   */
  get(channelId: string, msgId: string): RelayedMsgs | undefined {
    return this.msgs[channelId]?.record[msgId];
  }

  /**
   * ?????????????????????????????????????????????
   * @param channelId ?????????????????????????????????
   * @param msgId ????????????????????? id
   */
  getOrigin(
    channelId: string,
    msgId: string,
  ): { channelId: string; msgId: string } | undefined {
    return this.msgMap[channelId]?.[msgId];
  }

  /**
   * ??????????????????
   * @param channelId ??????????????????????????????
   * @param msgId ????????? id
   * @param relayed ????????????
   */
  push(channelId: string, msgId: string, relayed: RelayedMsgs): void {
    if (!this.msgs[channelId]) {
      this.msgs[channelId] = { recent: [], record: {} };
    }
    this.msgs[channelId].recent.push(msgId);
    this.msgs[channelId].record[msgId] = relayed;

    for (const rMsg of relayed) {
      if (!this.msgMap[rMsg.channelId]) this.msgMap[rMsg.channelId] = {};
      for (const relayedId of rMsg.msgIds) {
        this.msgMap[rMsg.channelId][relayedId] = { channelId, msgId };
      }
    }
    if (this.msgs[channelId].recent.length > this.limit) {
      const deletedMsgId = this.msgs[channelId]?.recent?.shift();
      if (deletedMsgId) {
        const records = this.msgs[channelId].record[deletedMsgId];
        records.forEach((r) => {
          for (const relayedId of r.msgIds)
            if (this.msgMap[r.channelId]?.[relayedId])
              delete this.msgMap[r.channelId][relayedId];
        });
        delete this.msgs[channelId].record[deletedMsgId];
      }
    }
    logger.debug('??????????????????', channelId, msgId, relayed);
  }

  constructor(public limit: number, debug = false) {
    if (!debug) return;
    if (cacheTimer) clearInterval(cacheTimer);
    cacheTimer = setInterval(() => {
      let cacheCount = 0;
      for (const cid in this.msgs) {
        cacheCount += this.msgs[cid].recent.length;
        for (const r in this.msgs[cid].record)
          cacheCount += this.msgs[cid].record[r].length;
      }
      for (const cid in this.msgMap)
        for (const msgId in this.msgMap[cid]) cacheCount += 1;
      logger.info(`Relay cache: ${cacheCount}`);
    }, 10 * Time.second);
  }
}

let cacheTimer: NodeJS.Timer;

function getBot(
  ctx: Context,
  platform: string,
  id: string,
): Bot<Bot.BaseConfig> | undefined {
  const bots = ctx.bots.filter((b) => b.platform == platform && b.selfId == id);
  if (bots.length) return bots[0];
}

export function apply(ctx: Context, config: Config): void {
  config.links = config.links.filter((l) => l.length >= 2);
  config.recent = config.recent || 1000;
  const recentMsgs = new RecentMsgs(config.recent);

  const webhookIDs: string[] = config.links.flatMap((link) => {
    const ids: string[] = [];
    for (const channel of link) {
      if (channel.platform == 'discord') ids.push(channel.webhookID);
    }
    return ids;
  });
  ctx // ??????????????????DC???????????????????????????????????????????????????????????????
    .middleware((session, next) => {
      if (session.platform == 'discord') {
        const userId = session?.author?.userId;
        if (userId && webhookIDs.includes(userId)) return '';
      }
      return next();
    }, true /* true ??????????????????????????? */);
  ctx // ??????????????????DC???????????????????????????????????????????????????????????????
    .platform('discord')
    .before('command/execute', ({ session }) => {
      const userId = session?.author?.userId;
      if (userId && webhookIDs.includes(userId)) return '';
    });

  const prefixes: string[] = config.links.flatMap((link) =>
    link.map(
      (channel) =>
        channel.msgPrefix || ptConfigDefault[channel.platform].msgPrefix,
    ),
  );

  config.links.forEach((linked) => {
    linked.forEach((partialChannelConf, i) => {
      const channelPlatform: 'onebot' | 'discord' | 'telegram' | 'minecraft' =
        partialChannelConf.platform;
      const source: channelConfigStrict = {
        ...ptConfigDefault[channelPlatform],
        ...partialChannelConf,
      };
      const destinations: channelConfigStrict[] = linked
        .filter((_, j) => i !== j)
        .map((d) => ({ ...ptConfigDefault[d.platform], ...d }));

      const onRelay = async (session: Session): Promise<void> => {
        const platform = session.platform;
        if (!platform || !session.content) return;
        // ??????????????????DC??????
        if (
          session?.author?.userId &&
          webhookIDs.includes(session?.author?.userId)
        )
          return;
        // ???????????? assignee ???????????????
        const assignee = (await session.observeChannel(['assignee']))
          ?.assignee;
        if (session.bot.selfId != assignee) return;
        const relayed: RelayedMsgs = [];
        for (const dest of destinations) {
          try {
            const msgIds = await relayMsg(
              ctx,
              session,
              source,
              dest,
              prefixes,
              recentMsgs,
            );
            const cid = `${dest.platform}:${dest.channelId}`;
            const botId = dest.botId;
            if (msgIds) relayed.push({ channelId: cid, botId, msgIds });
          } catch (e) {
            logger.warn('??????????????????', e);
          }
        }
        if (session.messageId) {
          recentMsgs.push(
            `${source.platform}:${source.channelId}`,
            session.messageId,
            relayed,
          );
        }
      };

      ctx // ????????????
        .channel(source.channelId)
        .on('message', onRelay);
      ctx // ???????????????
        .channel(source.channelId)
        .on('send', onRelay);
      ctx // ????????????
        .channel(source.channelId)
        .on('message-deleted', async (session) => {
          const deletedMsg = session.messageId;
          const channelId = session.channelId;
          const platform = session.platform;
          if (!deletedMsg || !channelId || !platform) return;
          const relayed = recentMsgs.get(
            `${platform}:${channelId}`,
            deletedMsg,
          );
          if (!relayed) return;

          let operator: Bot.User;
          try {
            if (session.operatorId)
              operator = await session.bot.getUser(session.operatorId);
          } catch {}
          try {
            relayed.forEach(async (record) => {
              const platform = record.channelId.split(':')[0];
              const cid = record.channelId.split(':').slice(1).join(':');
              const bot = getBot(ctx, platform, record.botId);
              if (!bot)
                throw new Error(`??????????????????????????????????????? ${record.botId}`);
              let msg;
              for (const rMsgId in record.msgIds) {
                try {
                  msg = await bot.getMessage(record.channelId, rMsgId);
                  break;
                } catch {}
              }
              const author =
                msg?.author?.nickname ||
                msg?.author?.username ||
                msg?.author?.userId;
              const actor =
                operator?.nickname || operator?.userId || operator?.userId;
              for (const rMsgId in record.msgIds) {
                try {
                  await bot.deleteMessage(cid, rMsgId);
                  logger.info(
                    `${actor} ????????? ${author} ????????????`,
                    record.channelId,
                    rMsgId,
                    msg?.content,
                  );
                } catch (e) {
                  logger.warn(`?????????????????????${e}`);
                }
              }
            });
          } catch (e) {
            logger.warn(`?????????????????????${e}`);
          }
        });
    });
    logger.success(
      linked.map((c) => `${c.platform}:${c.channelId}`).join(' ??? '),
    );
  });
}

async function relayMsg(
  ctx: Context,
  session: Session,
  source: channelConfigStrict,
  dest: channelConfigStrict,
  prefixes: string[],
  recentMsgs: RecentMsgs,
): Promise<string[] | undefined> {
  const author = session.author;
  const content = session.content;
  const channelId = session.channelId;
  const channelIdExtended = `${session.platform}:${channelId}`;
  if (!content || !author || !channelId || !session.platform) throw Error();
  const aliasDest: string = dest.platform == 'onebot' ? 'qq' : dest.platform;
  if (new RegExp(`(%disabled%|__no${aliasDest}__)`, 'i').test(content)) return;
  // ????????????????????????
  if (author.isBot !== false && prefixes.some((p) => content.startsWith(p)))
    return;

  const parsed = segment.parse(content);
  if (
    prefixes.some((p) =>
      parsed?.find((s) => s.type === 'text')?.data?.content?.startsWith(p),
    )
  )
    return;

  if (source.atOnly && !mentioned(parsed, source.botId)) return;
  let sender = author.nickname || author.username || '';
  if (!source.badId && dest.showId) {
    sender += author.discriminator ? `#${author.discriminator}` : '';
    sender +=
      !author.discriminator && author.userId ? ` (${author.userId})` : '';
  }

  const prefix = dest.usePrefix ? source.msgPrefix : '';
  let lastType = '';
  let foundQuoteMsg: string | undefined;
  const sourceBot = getBot(ctx, source.platform, source.botId);
  const processed: segment[] = await Promise.all(
    parsed.map(async (seg) => {
      const onErr = function (msg: string): segment {
        logger.warn(msg, seg);
        return seg;
      };
      const lastTypeNow = lastType;
      lastType = seg.type;
      switch (seg.type) {
        case 'text':
          return seg;
        case 'image':
          return {...seg, data: { url: seg.data.url }};
        case 'quote': {
          const referred = seg.data['id'];
          if (!referred) return onErr('?????????????????????????????????');
          const relayed = recentMsgs.get(channelIdExtended, referred);
          if (relayed?.length) {
            // ????????????????????????????????????????????????????????????
            const relayInDest = relayed.filter(
              (r) => r.channelId == `${dest.platform}:${dest.channelId}`,
            )[0];
            if (relayInDest?.msgIds) {
              foundQuoteMsg = relayInDest.msgIds[0];
              return { ...seg, data: { id: foundQuoteMsg } };
            } else return onErr('???????????????????????????????????????');
          } else {
            // ????????????????????????????????????????????????
            const orig = recentMsgs.getOrigin(channelIdExtended, referred);
            if (!orig)
              return onErr(
                `?????????????????????????????? ${channelIdExtended} ${referred}`,
              );
            if (orig.channelId == `${dest.platform}:${dest.channelId}`) {
              foundQuoteMsg = orig.msgId;
              return { ...seg, data: { id: orig.msgId } };
            } else {
              const relayed = recentMsgs.get(orig.channelId, orig.msgId);
              if (!relayed) return onErr('???????????????????????????');
              const relayInDest = relayed.filter(
                (r) => r.channelId == `${dest.platform}:${dest.channelId}`,
              )[0];
              if (!relayInDest) return onErr('??????????????????????????????????????????');
              foundQuoteMsg = relayInDest.msgIds[0];
              return { ...seg, data: { id: foundQuoteMsg } };
            }
          }
        }
        case 'at':
          if (seg.data.id == source.botId)
            return { type: 'text', data: { content: '' } };
          // QQ ??? quote ?????????????????? at
          if (source.platform == 'onebot' && lastTypeNow == 'quote')
            return { type: 'text', data: { content: '' } };
          // ???????????? at ???????????? at ?????????????????????
          const escape =
            source.platform != dest.platform ||
            seg?.data?.role ||
            seg?.data?.type;
          if (escape) {
            let atTarget =
              seg?.data?.name ||
              seg?.data?.id ||
              seg?.data?.role ||
              seg?.data?.type ||
              '????????????';
            if (seg?.data?.id && !seg?.data?.name) {
              let user;
              try {
                user = await sourceBot?.getUser(seg?.data?.id);
              } catch (e) {
                logger.warn('Error when getting at target user???' + e);
              }
              const atTargetName = user?.nickname || user?.username || '';
              if (atTargetName) atTarget = atTargetName;
            }
            return { type: 'text', data: { content: `@${atTarget}` } };
          }
        default:
          return seg;
      }
    }),
  );
  const bot = getBot(ctx, dest.platform, dest.botId);
  if (!bot)
    throw new Error(`????????? ${dest.platform} ????????????????????? ${dest.botId}`);
  const relayedText = segment.join(processed);
  try {
    let msgIds: string[];

    switch (dest.platform) {
      case 'discord': {
        bot.platform == 'discord';
        const whCard = [];
        if (foundQuoteMsg) {
          whCard.push({
            description: `[??????????????????](https://discord.com/channels/${dest.guildId}/${dest.channelId}/${foundQuoteMsg})`,
          });
        }
        const dcBot = bot as unknown as DiscordBot;
        const avatar_url =
          source.platform == 'onebot'
            ? `http://q1.qlogo.cn/g?b=qq&nk=${author.userId}&s=640`
            : author.avatar;

        const url = `/webhooks/${dest.webhookID}/${dest.webhookToken}?wait=1`;
        msgIds = await Sender.from(dcBot, url)(
          segment.join(processed.filter((s) => s.type !== 'quote')),
          {
            username: prefix + sender,
            avatar_url,
            embeds: whCard,
          },
        );
        break;
      }
      case 'minecraft':
        msgIds = await bot.sendMessage(
          dest.channelId,
          `${prefix}${sender}: ${relayedText}`,
        );
        break;
      case 'telegram':
      default: {
        msgIds = await bot.sendMessage(
          dest.channelId,
          `${prefix}${sender}???\n${relayedText}`,
        );
        break;
      }
    }
    logger.info(
      '???',
      `${source.msgPrefix} ?????????????????? ${dest.msgPrefix}`,
      sender,
      session.content,
    );
    return msgIds;
  } catch (error) {
    logger.warn(
      '??????????????????',
      `${source.msgPrefix} ??? ${dest.msgPrefix}`,
      sender,
      session.content,
      error,
    );
  }
}

const mentioned = (segs: segment.Chain, botId: string): boolean =>
  segs.some((seg) => seg.type == 'at' && seg.data.id == botId);
