import { Bot as GBot, Message } from '@qq-guild-sdk/core';
import { Adapter, App, segment, Session, Bot } from 'koishi';
import { QQGuildBot } from './bot';

declare module 'koishi-core' {
  interface AppOptions {
    qqguild?: AdapterConfig;
  }

  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Bot {
    interface Platforms {
      qqguild: QQGuildBot;
    }
  }
}

type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;
export interface AdapterConfigStrict extends GBot.Options {
  indents: GBot.Intents | number;
}
export type AdapterConfig = Optional<AdapterConfigStrict, 'sandbox'>;
export const adapterConfigDefault = {
  sandbox: true,
  endpoint: 'https://api.sgroup.qq.com/',
  authType: 'bot' as const,
};

const createSession = (bot: QQGuildBot, msg: Message) => {
  const { id: messageId, guildId, channelId, timestamp } = msg;
  const session: Partial<Session> = {
    selfId: bot.selfId,
    groupId: guildId,
    messageId,
    channelId,
    timestamp:
      typeof timestamp === 'string' ? Date.parse(timestamp) : +timestamp,
  };
  session.platform = 'qqguild';
  session.groupId = msg.guildId;
  session.channelId = msg.channelId;
  session.type = 'message';
  session.subtype = 'group';
  session.content = msg.content
    .replace(/<@!(.+)>/, (_, $1) => segment.at($1))
    .replace(/<#(.+)>/, (_, $1) => segment.sharp($1));
  session.author = {
    userId: msg.author.id,
    username: msg.author.username,
    avatar: msg.author.avatar,
    isBot: false,
  };
  session.userId = session.author.userId;
  return new Session(bot.app, session);
};

export class WebSocketClient extends Adapter<'qqguild'> {
  config: AdapterConfigStrict;
  constructor(app: App) {
    super(app, QQGuildBot);
    if (!this.app.options.qqguild) throw new Error('no options');
    this.config = { ...adapterConfigDefault, ...this.app.options.qqguild };
  }
  async start(): Promise<void> {
    this.bots.forEach(async (bot) => {
      bot.$innerBot = new GBot(this.config);

      await bot.$innerBot.startClient(this.config.indents);
      // bot.$innerBot.on('ready', bot.resolve)
      bot.$innerBot.on('message', (msg) => {
        const session = createSession(bot, msg);
        if (session) this.dispatch(session);
      });
      const me = await bot.$innerBot.me;
      bot.avatar = me.avatar;
      bot.isBot = me.bot;
      bot.username = me.username;
      bot.selfId = me.id;
      bot.status = Bot.Status.GOOD;
    });
  }
  async stop(): Promise<void> {
    return;
  }
}
