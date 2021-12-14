import { Message } from '@qq-guild-sdk/core';
import { Adapter, App, segment, Session } from 'koishi';
import { BotConfig, QQGuildBot } from './bot';

declare module 'koishi-core' {
  interface AppOptions {
    qqGuild?: BotConfig;
  }

  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Bot {
    interface Platforms {
      qqGuild: QQGuildBot;
    }
  }
}

export type AdapterConfigStrict = {
  sandbox: boolean;
  endpoint: string;
  authType: 'bot' | 'bearer';
};
export type AdapterConfig = Partial<AdapterConfigStrict>;
export const adapterConfigDefault: AdapterConfigStrict = {
  sandbox: true,
  endpoint: 'https://api.sgroup.qq.com/',
  authType: 'bot',
};

const createSession = (bot: QQGuildBot, msg: Message) => {
  const { id: messageId, guildId, channelId, timestamp } = msg;
  const session: Partial<Session> = {
    selfId: bot.selfId,
    guildId,
    messageId,
    channelId,
    timestamp: +timestamp,
  };
  session.guildId = msg.guildId;
  session.channelId = msg.channelId;
  session.subtype = 'group';
  session.content = msg.content
    .replace(/<@!(.+)>/, (_, $1) => segment.at($1))
    .replace(/<#(.+)>/, (_, $1) => segment.sharp($1));
  return new Session(bot.app, session);
};

export class WebSocketClient extends Adapter<'qqGuild'> {
  config: AdapterConfigStrict;
  constructor(app: App) {
    super(app);
    this.config = { ...adapterConfigDefault, ...this.app.options.qqGuild };
  }
  async start(): Promise<void> {
    this.bots.forEach(async (bot) => {
      await bot.$innerBot.startClient(bot.config.indents);
      // bot.$innerBot.on('ready', bot.resolve)
      bot.$innerBot.on('message', (msg) => {
        const session = createSession(bot, msg);
        if (session) this.dispatch(session);
      });
    });
  }
  async stop(): Promise<void> {
    return;
  }
}
