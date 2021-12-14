import { Bot as GBot, Guild as GGuild } from '@qq-guild-sdk/core';
import { Bot } from 'koishi-core';

export interface GuildInfo {
  groupId: string;
  groupName: string;
}

const adaptGuild = (guild: GGuild): GuildInfo => ({
  groupId: guild.id,
  groupName: guild.name,
});

export class QQGuildBot extends Bot {
  $innerBot?: GBot;

  async sendMessage(
    channelId: string,
    content: string,
    guildId?: string,
  ): Promise<string> {
    if (!this.$innerBot) throw new Error('no internal bot');
    const resp = await this.$innerBot.send.channel(channelId, content);
    return resp.id;
  }

  async getGuildList(): Promise<GuildInfo[]> {
    if (!this.$innerBot) throw new Error('no internal bot');
    return this.$innerBot.guilds.then((guilds) => guilds.map(adaptGuild));
  }
}
