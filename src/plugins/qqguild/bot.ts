import { Bot as GBot, Guild as GGuild } from '@qq-guild-sdk/core';
import { Bot, BotOptions as BaseConfig } from 'koishi-core';
import { WebSocketClient } from './ws';

export interface BotConfig extends BaseConfig, GBot.AppConfig {
  token: string;
  indents: GBot.Intents | number;
}

export interface GuildInfo {
  groupId: string;
  groupName: string;
}

const adaptGuild = (guild: GGuild): GuildInfo => ({
  groupId: guild.id,
  groupName: guild.name,
});

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

export class QQGuildBot extends Bot {
  $innerBot: GBot;
  config: BotConfig;

  constructor(adapter: WebSocketClient, options: BotConfig) {
    super(adapter, options);
    this.$innerBot = new GBot({ app: options, ...adapter.config });
    this.config = options;
  }

  async sendMessage(
    channelId: string,
    content: string,
    guildId?: string,
  ): Promise<string> {
    const resp = await this.$innerBot.send.channel(channelId, content);
    return resp.id;
  }

  async getGuildList(): Promise<GuildInfo[]> {
    return this.$innerBot.guilds.then((guilds) => guilds.map(adaptGuild));
  }
}
