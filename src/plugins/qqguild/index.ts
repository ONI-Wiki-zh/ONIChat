import { Adapter } from 'koishi-core';
import { BotConfig, QQGuildBot } from './bot';
import { WebSocketClient } from './ws';

export * from '@qq-guild-sdk/core';

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

Adapter.types['qqGuild:ws'] = WebSocketClient;
Adapter.types['qqGuild'] = Adapter.redirect(() => 'qqGuild:ws');
