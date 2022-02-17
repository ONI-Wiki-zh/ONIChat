import { Logger, Time } from '@koishijs/utils';
import RssParser from 'rss-parser';
import { Context, Session, sleep } from 'koishi';
import RssFeedEmitter from 'rss-feed-emitter';
import textVersion from 'textversionjs';

declare module 'koishi' {
  interface Tables {
    rss: Rss;
  }
}

export interface Rss {
  id: number;
  assignee: string;
  session: Partial<Session>;
  url: string;
}

export interface Config {
  timeout?: number;
  refresh?: number;
  userAgent?: string;
}

const logger = new Logger('rss');

export const name = 'rss';
export const using = ['database'];

export function apply(ctx: Context, config: Config = {}): void {
  ctx.model.extend(
    'rss',
    {
      id: 'unsigned',
      assignee: 'text',
      session: 'json',
      url: 'text',
    },
    {
      autoInc: true,
    },
  );

  const {
    timeout = 10 * Time.second,
    refresh = 10 * Time.second,
    userAgent,
  } = config;
  const feeder = new RssFeedEmitter({ skipFirstLoad: true, userAgent });
  // map url to multiple channel ids
  const feedMap: Record<string, Set<string>> = {};

  // Will not modify database
  function subscribe(url: string, channelId: string): void {
    if (url in feedMap) {
      feedMap[url].add(channelId);
    } else {
      feedMap[url] = new Set([channelId]);
      feeder.add({ url, refresh });
      logger.debug('subscribe %s', url);
    }
  }

  // Will not modify database
  function unsubscribe(url: string, channelId: string): void {
    feedMap[url].delete(channelId);
    if (!feedMap[url].size) {
      delete feedMap[url];
      feeder.remove(url);
      logger.debug('unsubscribe %s', url);
    }
  }

  ctx.on('dispose', () => {
    feeder.destroy();
  });

  ctx.on('ready', async () => {
    feeder.on('error', (err: Error) => {
      logger.warn(err.message);
    });

    const records = await ctx.database.get('rss', {});
    for (const r of records) {
      const channelId = `${r.session.platform}:${r.session.channelId}`;
      if (channelId === undefined) {
        logger.warn('Unexpected rss record.');
      } else {
        subscribe(r.url, channelId);
      }
    }

    feeder.on('new-item', async (payload) => {
      logger.debug('receive', payload.title);
      const source = payload.meta.link;
      if (!feedMap[source]) return;

      const msg = formatRssPayload(payload);
      logger.warn([...feedMap[source]]);

      await ctx.broadcast([...feedMap[source]], msg);

      for (const e of feedMap[source]) {
        if (e.includes(':private:')) {
          const [platfrom, userId] = e.split(':private:');
          const bot = ctx.bots.find((b) => b.platform == platfrom);
          if (!bot) logger.warn('No bot on platform ' + platfrom);
          else bot.sendPrivateMessage(userId, msg);
          await sleep(1000);
        }
      }
    });
  });

  const validators: Record<string, Promise<unknown>> = {};
  async function validate(url: string, session: Session): Promise<unknown> {
    if (validators[url] !== undefined) {
      await session.send('正在尝试连接……');
      return validators[url];
    }

    let timer: NodeJS.Timeout;
    const feeder = new RssFeedEmitter({ userAgent });
    return (validators[url] = new Promise((resolve, reject) => {
      // rss-feed-emitter's typings suck
      feeder.add({ url, refresh: 1 << 30 });
      feeder.on('new-item', resolve);
      feeder.on('error', reject);
      timer = setTimeout(() => reject(new Error('connect timeout')), timeout);
    }).finally(() => {
      feeder.destroy();
      clearTimeout(timer);
      delete validators[url];
    }));
  }

  ctx
    .command('rss <url:text>', '订阅 RSS 链接')
    .channelFields(['id'])
    .option('list', '-l 查看订阅列表')
    .option('remove', '-r 取消订阅', { authority: 2 })
    .action(async ({ session, options }, url) => {
      const channelId = `${session?.platform}:${session?.channelId}`;
      if (session === undefined || channelId === undefined) {
        logger.warn('Can not get current session data.');
        return;
      }
      const subscribed: Set<string> = new Set();
      for (const subscribedUrl in feedMap) {
        if (feedMap[subscribedUrl].has(channelId)) {
          subscribed.add(subscribedUrl);
        }
      }

      if (options?.list) {
        if (!subscribed.size) return '未订阅任何链接。';
        return [...subscribed].join('\n');
      }

      const alreadySubscribed = subscribed.has(url);

      if (options?.remove) {
        if (!alreadySubscribed) return '未订阅此链接。';
        unsubscribe(url, channelId);
        await ctx.database.remove('rss', {
          assignee: session.sid,
          url: url,
        });
        return '取消订阅成功！';
      }

      if (alreadySubscribed) return '已订阅此链接。';
      return validate(url, session).then(
        async () => {
          await ctx.database.create('rss', {
            assignee: session.sid,
            session: session.toJSON(),
            url: url,
          });
          subscribe(url, channelId);
          return '添加订阅成功！';
        },
        (error) => {
          logger.debug(error);
          return '无法订阅此链接。';
        },
      );
    });

  ctx
    .channel()
    .command('rss.latest <url:text>', '获取最新推送')
    .action(async ({ session }, url) => {
      if (!session?.channel)
        throw new Error('Type trick; Should never thrown.');
      const res = await ctx.http.get(url);
      const parser = new RssParser();
      const feed = await parser.parseString(res);
      const item = feed.items?.[0] || {};
      item.meta = {
        title: feed.title,
      };
      logger.success(formatRssPayload(item));
      return formatRssPayload(item);
    });
}
type RssPayload = {
  title?: string;
  meta?: { title?: string };
  author?: string;
  description?: string;
  link?: string;
};

function formatRssPayload(payload: RssPayload): string {
  const firstLine: string[] = [`[${payload?.meta?.title}]`];
  if (payload.title) firstLine.push(payload.title);
  if (payload.author) firstLine.push(`(${payload.author})`);

  // remove empty lines
  let desc: string =
    payload.description?.replace(/\t/g, ' ')?.replace(/^\s*\n/gm, '') || '';
  desc = textVersion(payload.description || '', {
    linkProcess: (_l, t: string) => `[${t}]`,
  });
  desc = desc.trim();
  const msg = [`${firstLine.join(' ')}`];
  if (desc) msg.push(desc);
  if (payload.link) msg.push(`原文链接：${payload.link}`);

  return msg.join('\n');
}
