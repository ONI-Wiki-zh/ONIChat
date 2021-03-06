import { Logger, Time } from '@koishijs/utils';
import cheerio from 'cheerio';
import { Context, Session, sleep } from 'koishi';
import RssFeedEmitter from 'rss-feed-emitter';
import RssParser from 'rss-parser';
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
      await session.send('????????????????????????');
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
    .command('rss <url:text>', '?????? RSS ??????')
    .channelFields(['id'])
    .option('list', '-l ??????????????????')
    .option('remove', '-r ????????????', { authority: 2 })
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
        if (!subscribed.size) return '????????????????????????';
        return [...subscribed].join('\n');
      }

      const alreadySubscribed = subscribed.has(url);

      if (options?.remove) {
        if (!alreadySubscribed) return '?????????????????????';
        unsubscribe(url, channelId);
        await ctx.database.remove('rss', {
          assignee: session.sid,
          url: url,
        });
        return '?????????????????????';
      }

      if (alreadySubscribed) return '?????????????????????';
      return validate(url, session).then(
        async () => {
          await ctx.database.create('rss', {
            assignee: session.sid,
            session: session.toJSON(),
            url: url,
          });
          subscribe(url, channelId);
          return '?????????????????????';
        },
        (error) => {
          logger.debug(error);
          return '????????????????????????';
        },
      );
    });

  ctx
    .channel()
    .command('rss.latest <url:text>', '??????????????????')
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
  content?: string;
  link?: string;
};

function formatRssPayload(payload: RssPayload): string {
  const firstLine: string[] = [`[${payload?.meta?.title}]`];
  if (payload.title) firstLine.push(payload.title);
  if (payload.author) firstLine.push(`(${payload.author})`);

  // remove empty lines
  let desc: string =
    (payload.description || payload.content)
      ?.replace(/\t/g, ' ')
      ?.replace(/^\s*\n/gm, '') || '';

  const $ = cheerio.load(desc || '');
  $('table').remove();

  desc = textVersion($.html(), {
    linkProcess: (_l, t: string) => `[${t}]`,
  }).trim();

  const originalLength = desc.length;
  // max 600 chars
  desc = truncate(desc, 600);

  // max 20 lines
  desc = desc.split('\n').slice(0, 20).join('\n');

  if (desc.length < originalLength) desc += ' ...';

  const msg = [`${firstLine.join(' ')}`];
  if (desc) msg.push(desc);
  if (payload.link) msg.push(`???????????????${payload.link}`);

  return msg.join('\n');
}

const END = /(\s|\.|,|;|!|\(|???|???|???|???|???)/;
function truncate(str: string, limit: number): string {
  if (str.length < limit) return str;
  let idx = str.slice(limit).search(END);
  if (idx < 0) idx = Infinity;
  idx += limit;
  return str.slice();
}
