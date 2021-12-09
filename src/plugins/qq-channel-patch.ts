/**
 * @name koishi-plugin-qq-channel-patch
 * @author Dragon-Fish <dragon-fish@qq.com>
 *
 * @desc Temporary patch for QQ channel for koishi.js
 */
import JSONbig from 'json-bigint';
import { Context, Logger, segment } from 'koishi';
import { CQBot } from 'koishi-adapter-onebot/lib/bot';

declare module 'koishi-adapter-onebot' {
  interface CQBot {
    $sendGuildMessage: any;
  }
}
declare module 'koishi-core' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  export namespace Session {
    interface MessageType {
      guild: unknown;
    }
  }
  interface Session {
    guildId: string;
  }
}
const logger = new Logger('qq-channel');

export const name = 'qq-channel-patch';

export function apply(ctx: Context): void {
  // Hack JSON
  JSON.parse = JSONbig.parse;

  // Adjust guild cahnnelId
  ctx.on('message', (session) => {
    if ((session.subtype as string) === 'guild') {
      session.channelId = `guild:${session.guildId || ''}-${session.channelId}`;
      // logger.info('message', session.guildId, session.channelId)
    }
  });

  // Hack Adapter Onebot
  CQBot.prototype.sendMessage = async function (
    channelId: string,
    content: string,
  ): Promise<string> {
    content = renderText(content);
    if (channelId.startsWith('private:')) {
      return await this.sendPrivateMessage(channelId.slice(8), content);
    } else if (channelId.startsWith('guild:')) {
      return await this.$sendGuildMessage(channelId.slice(6), content);
    } else {
      return await this.sendGroupMessage(channelId, content);
    }
  };
  CQBot.prototype.$sendGuildMessage = async function (
    channel: string,
    content: string,
  ): Promise<string> {
    if (!content) return '';
    // logger.info(
    //   'send',
    //   channel,
    //   content.length > 120 ? content.slice(0, 120) + '...' : content
    // )
    const [guildId, channelId] = channel.split('-');
    const session = this.createSession({
      content,
      subtype: 'guild',
      guildId,
      channelId,
    });
    if (this.app.bail(session, 'before-send', session)) return '';
    session.messageId = (
      await this.get('send_guild_channel_msg', {
        guild_id: guildId,
        channel_id: channelId,
        message: content,
      })
    )?.messageId;
    this.app.emit(session, 'send', session);
    return session.messageId || '';
  };
}

function renderText(source: string): string {
  return segment.parse(source).reduce((prev, { type, data }) => {
    if (type === 'at') {
      if (data.type === 'all') return prev + '[CQ:at,qq=all]';
      return prev + `[CQ:at,qq=${data.id}]`;
    } else if (['video', 'audio', 'image'].includes(type)) {
      if (type === 'audio') type = 'record';
      if (!data.file) data.file = data.url;
    } else if (type === 'quote') {
      type = 'reply';
    }
    return prev + segment(type, data);
  }, '');
}
