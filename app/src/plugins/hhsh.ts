import { Context } from 'koishi';
import axios from 'axios';

const usage = `调用外部 API，不对其结果负责。

API 提供者的网站：https://lab.magiconch.com/nbnhhsh/
本插件修改自 2bot-v4: https://github.com/idlist/2bot-v4/blob/main/plugins/fun/hhsh.js
`;
interface OfficialAbbrs {
  name: string;
  trans: string[];
}

interface UserAbbrs {
  name: string;
  inputting: string[];
}

export interface AbbrsPayload {
  data: OfficialAbbrs[] | UserAbbrs[];
}

export default (ctx: Context): void => {
  const logger = ctx.logger('hhsh');

  ctx
    .command('hhsh <abbr>', '好好说话')
    .alias('好好说话')
    .usage(usage)
    .action(async ({ session }, abbr) => {
      try {
        if (!abbr) return session?.execute('help hhsh');

        const resolve: AbbrsPayload = await axios.post(
          'https://lab.magiconch.com/api/nbnhhsh/guess',
          { text: abbr },
        );
        const data = resolve.data[0];
        logger.debug(data);

        if ('trans' in data) {
          const word = data;
          return `${word.name} 可能代表：${word.trans.join('、')}。`;
        } else if (data.inputting.length) {
          const word = data;
          return `${word.name} 可能代表：${word.inputting.join('、')}。`;
        } else {
          return `没有找到 ${abbr} 可能代表的词……`;
        }
      } catch (error) {
        logger.warn(error);
        return 'API 调用过程出现了错误。';
      }
    });
};
