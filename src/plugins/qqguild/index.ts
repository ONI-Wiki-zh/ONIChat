import { Adapter } from 'koishi-core';
import { QQGuildBot } from './bot';
import { WebSocketClient, AdapterConfig } from './ws';

export * from '@qq-guild-sdk/core';

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

Adapter.types['qqguild:ws'] = WebSocketClient;
Adapter.types['qqguild'] = Adapter.redirect(() => 'qqguild:ws');
