import axios from 'axios';
import { Logger } from 'koishi-core';
import { sleep, Random } from 'koishi-utils';

const MOCK_HEADER = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36 Edg/92.0.902.78',
};
const URLS = {
  list: 'https://api.vc.bilibili.com/dynamic_svr/v1/dynamic_svr/space_history',
  detail:
    'https://api.vc.bilibili.com/dynamic_svr/v1/dynamic_svr/get_dynamic_detail',
  user: 'https://api.bilibili.com/x/space/acc/info',
};
const IGNORED_SUMMARIES = ['点击进入查看全文>'];

const logger = new Logger('bdFeeder');

export enum DynamicTypeFlag {
  forward = 1,
  image = 2,
  text = 4,
  video = 8,
  article = 64,
  others = 256,
}

type DynamicItemTypes =
  | {
    //转发动态
    type: DynamicTypeFlag.forward;
    content: string;
    origin: DynamicItem;
  }
  | {
    //图片动态
    type: DynamicTypeFlag.image;
    desc: string;
    imgs: string[];
  }
  | {
    //文字动态
    type: DynamicTypeFlag.text;
    content: string;
  }
  | {
    //视频动态
    type: DynamicTypeFlag.video;
    text: string;
    videoTitle: string;
    videoCover: string;
    videoDesc: string;
    videoUrl: string;
  }
  | {
    //专栏动态
    type: DynamicTypeFlag.article;
    title: string;
    summary: string;
    imgs: string[];
    articleUrl: string;
  }
  | {
    //其它
    type: DynamicTypeFlag.others;
    typeCode: number;
  };
type DynamicItemBase = {
  username: string;
  url: string;
  raw: CardData;
};
export type DynamicItem = DynamicItemTypes & DynamicItemBase;
type newDynamicHandler = (e: DynamicItem) => void;
type DFRecord = {
  username: string;
  latestDynamic: string;
  cbs: Record<string, newDynamicHandler>;
};
type CardData = {
  desc: any;
  card: any;
};

export class DynamicFeeder {
  followed: Record<string, DFRecord>;
  timer: NodeJS.Timer;

  async onNewDynamic(
    uid: string,
    recordId: string,
    cb: newDynamicHandler,
  ): Promise<Omit<DFRecord, 'cbs'>> {
    if (this.followed[uid] == undefined) {
      const username = await this.getUsername(uid);
      this.followed[uid] = { latestDynamic: '', username, cbs: {} };
    }
    this.followed[uid].cbs[recordId] = cb;
    const { username, latestDynamic } = this.followed[uid];
    return { username, latestDynamic };
  }

  async getUsername(uid: string): Promise<string> {
    const { data } = await axios.get(URLS.user, {
      params: { mid: uid, jsonp: 'jsonp' },
      headers: MOCK_HEADER,
    });
    if (data?.code != 0) {
      logger.warn(
        `Get bilibili user info uid ${uid}: code ${data?.code} error`,
      );
      return;
    }
    return data?.data?.name;
  }

  async getDynamicCard(did: string): Promise<CardData> {
    return new Promise((resolve, reject) => {
      axios
        .get(URLS.detail, {
          params: { dynamic_id: did },
          headers: MOCK_HEADER,
        })
        .then((res) => {
          const data = res.data;
          if (data?.code != 0) {
            const errMsg = `Get bilibili dynamic of mid ${did}: code ${data?.code}`;
            logger.warn(errMsg);
            reject(errMsg);
            return;
          }
          resolve(data?.data?.card);
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  async parseDynamicCard(card: CardData): Promise<DynamicItem> {
    const latestDynamicId = card.desc.dynamic_id_str;
    const username = card.desc.user_profile.info.uname;
    const url = `https://t.bilibili.com/${latestDynamicId}`;
    const dynamicType = card.desc.type;
    const details = JSON.parse(card.card);
    const dynamicItemBase: DynamicItemBase = {
      username,
      url,
      raw: { ...card, card: details },
    };
    let dynamicItem: DynamicItem;
    switch (dynamicType) {
      case DynamicTypeFlag.forward: //转发动态
        {
          const originId: string = card.desc.orig_dy_id_str;
          const originCard = await this.getDynamicCard(originId);
          const content = unescape(details.item.content);
          dynamicItem = {
            type: dynamicType,
            ...dynamicItemBase,
            content,
            origin: await this.parseDynamicCard(originCard),
          };
        }
        break;
      case DynamicTypeFlag.image: //图片动态
        {
          const desc = unescape(details.item.description);
          const imgs = details.item.pictures.map((p: { img_src: string }) =>
            unescape(p.img_src),
          );
          dynamicItem = {
            type: dynamicType,
            ...dynamicItemBase,
            desc,
            imgs,
          };
        }
        break;
      case DynamicTypeFlag.text: //文字动态
        {
          const content = unescape(details.item.content);
          dynamicItem = {
            type: dynamicType,
            ...dynamicItemBase,
            content,
          };
        }
        break;
      case DynamicTypeFlag.video: //视频动态
        {
          const bv = card.desc.bvid;
          const text = unescape(details.dynamic);
          const videoTitle = unescape(details.title);
          const videoCover = unescape(details.pic);
          const videoDesc = unescape(details.desc);
          const videoUrl = `https://b23.tv/${bv}`;
          dynamicItem = {
            type: dynamicType,
            ...dynamicItemBase,
            text,
            videoTitle,
            videoCover,
            videoDesc,
            videoUrl,
          };
        }
        break;
      case DynamicTypeFlag.article: //专栏动态
        {
          const summary = unescape(details.summary);
          dynamicItem = {
            type: DynamicTypeFlag.article,
            ...dynamicItemBase,
            title: unescape(details.title),
            summary: IGNORED_SUMMARIES.includes(summary) ? '' : summary,
            imgs: details.image_urls.map((p: string) => unescape(p)),
            articleUrl: `https://www.bilibili.com/read/cv${details.id}`,
          };
        }
        break;
      default:
        //其它
        {
          dynamicItem = {
            type: DynamicTypeFlag.others,
            typeCode: dynamicType,
            ...dynamicItemBase,
          };
        }
        break;
    }
    return dynamicItem;
  }

  constructor(
    pollInterval: number,
    updateLatestDynamicId: (
      uid: string,
      username: string,
      latest: string,
    ) => void,
  ) {
    this.followed = {};
    this.timer = setInterval(
      (async () => {
        logger.info('Polling Bilibili...');

        for (const uid in this.followed) {
          if (Object.keys(this.followed[uid].cbs).length == 0) continue;

          await sleep(Random.int(10, 50));
          const { data } = await axios.get(URLS.list, {
            params: { host_uid: uid, offset_dynamic_id: '0' },
            headers: MOCK_HEADER,
          });
          if (data?.code != 0) {
            logger.warn(
              `Get bilibili dynamics list failed for uid ${uid}: code ${data?.code}`,
            );
            continue;
          }
          const latestDynamic = data.data.cards[0];
          const latestDynamicId = latestDynamic.desc.dynamic_id_str;
          const username = latestDynamic.desc.user_profile.info.uname;
          if (this.followed[uid].latestDynamic == latestDynamicId) {
            continue;
          } else {
            this.followed[uid].latestDynamic = latestDynamicId;
          }
          updateLatestDynamicId(uid, username, latestDynamicId);

          const dynamicItem: DynamicItem = await this.parseDynamicCard(
            latestDynamic,
          );
          const cbs = this.followed[uid].cbs;
          for (const id in cbs){
            cbs[id](dynamicItem);
            await sleep(Random.int(1000, 2000)); 
          } 
        }
      }).bind(this),
      pollInterval,
    );
  }

  removeCallback(uid: string, recordId: string) {
    if (this.followed[uid] == undefined) return false;
    if (this.followed[uid].cbs[recordId] == undefined) return false;
    this.followed[uid].cbs[recordId] = undefined;
    return true;
  }

  destroy() {
    clearInterval(this.timer);
  }
}
