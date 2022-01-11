// https://github.com/idlist/koishi-plugin-gosen-choyen
import { access } from 'fs/promises';
import { resolve } from 'path';
import { cwd } from 'process';
import { s, Context } from 'koishi';
import { registerFont, createCanvas, Canvas } from 'canvas';

export interface ConfigObject {
  /** 设置上行文字。 */
  upper: {
    /** 设置上行文字的字体文件路径。*/
    path: string;
    /** 设置上行文字的字体名。 */
    name?: string;
    /** 设置上行文字的字重。 */
    weight?: string | number;
  };
  /** 设置下行文字。 */
  lower: {
    /** 设置下行文字的字体文件路径。 */
    path: string;
    /** 设置下行文字的字体名。 */
    name?: string;
    /** 设置下行文字的字重。 */
    weight?: string | number;
  };
  /**
   * 是否强制清除消息段中的非文字元素。
   *
   * 当设置为 `true` 时，指令选项 `--reserve` 将失效。
   *
   * @default false
   */
  disableCQCode?: boolean;
  /**
   * 一行最多字符数
   *
   * @default 42
   */
  maxLength?: number;
  /**
   * 第二行文字的默认向右偏移距离（单位为px）
   *
   * @default 200
   */
  defaultOffsetX?: number;
  /**
   * 第二行文字的最大向右偏移距离（单位为px）
   *
   * @default 1000
   */
  maxOffsetX?: number;
}

export interface ImageGeneratorOptions {
  reserve: boolean;
  maxLength: number;
  offsetX: number;
  upper: {
    font: string;
    weight: string | number;
  };
  lower: {
    font: string;
    weight: string | number;
  };
}

export const name = 'gosen-choyen';
export const apply = async (
  ctx: Context,
  config: ConfigObject,
): Promise<void> => {
  const logger = ctx.logger('gosen-choyen');

  config = {
    disableCQCode: false,
    maxLength: 42,
    defaultOffsetX: 200,
    maxOffsetX: 1000,
    ...config,
  };

  const upperFormat = { font: '', weight: 'normal' };
  const lowerFormat = { font: '', weight: 'normal' };

  try {
    await access(config.upper?.path || '');

    let path;
    if (config.upper.path.startsWith('./')) {
      path = resolve(cwd(), config.upper.path);
    } else {
      path = config.upper.path;
    }

    registerFont(path, {
      family: '5k-upper',
      weight: upperFormat.weight,
    });
    upperFormat.font = '5k-upper';
  } catch {
    logger.error('The font path for upper text does not exists.');
  }

  try {
    await access(config.lower.path);

    let path;
    if (config.lower.path.startsWith('./')) {
      path = resolve(cwd(), config.lower.path);
    } else {
      path = config.lower.path;
    }

    registerFont(path, {
      family: '5k-lower',
      weight: lowerFormat.weight,
    });
    lowerFormat.font = '5k-lower';
  } catch {
    logger.error('The font path for lower text does not exists.');
  }

  if (config.upper.name) upperFormat.font = config.upper.name;
  if (config.upper.weight) upperFormat.weight = config.upper.weight.toString();
  if (config.lower.name) lowerFormat.font = config.lower.name;
  if (config.lower.weight) lowerFormat.font = config.lower.weight.toString();

  if (!upperFormat.font || !lowerFormat.font) {
    logger.error('Fonts are not provided. The plugin is not installed.');
    return;
  }

  ctx
    .command('5k <upper> <lower>', '生成5000兆円风格字体')
    .usage(
      '若upper或lower为""可使其为空；含有空格或以-开头的内容需要用""包围起来。',
    )
    .option('offset', '-x <px> 设置第二行偏移量（默认为200px）')
    .option('reserve', '-r 保留CQ码')
    .example('5k 5000兆円 欲しい！  生成字体图')
    .action(async ({ session, options }, upper, lower) => {
      if (
        !options ||
        !session ||
        config.maxLength === undefined ||
        config.maxOffsetX === undefined
      )
        throw Error('Never here');
      const parsed: ImageGeneratorOptions = {
        reserve: options?.reserve ?? false,
        maxLength: config.maxLength,
        offsetX: !isNaN(options?.offset)
          ? options?.offset
          : config.defaultOffsetX,
        upper: { ...upperFormat },
        lower: { ...lowerFormat },
      };

      if (config.disableCQCode) options.reserve = false;
      if (parsed.offsetX < 0) parsed.offsetX = 0;
      if (parsed.offsetX > config.maxOffsetX)
        parsed.offsetX = config.maxOffsetX;

      const validateInput = (str: string): string => {
        return typeof str == 'undefined'
          ? ''
          : str.toString().trim().replace(/\r\n/g, ' ');
      };

      const clearCQCode = (str: string): string => {
        return str.replace(/\[CQ:.+\]/g, '');
      };

      if (parsed.reserve !== true) {
        upper = clearCQCode(upper);
        lower = clearCQCode(lower);
      }

      upper = s.unescape(validateInput(upper));
      lower = s.unescape(validateInput(lower));

      if (!upper && !lower) {
        return session.execute('help 5k');
      }

      if (upper.length > parsed.maxLength || lower.length > parsed.maxLength) {
        return '内容太长了。';
      }

      const canvas = generateImage(upper, lower, parsed);

      try {
        const imageData = canvas.toBuffer().toString('base64');
        return s('image', { url: `base64://${imageData}` });
      } catch (err) {
        logger.warn('something went wrong when sending image');
        logger.warn(err);
      }
    });
};

const generateImage = (
  upper: string,
  lower: string,
  options: ImageGeneratorOptions,
): Canvas => {
  // shorthand variable names
  const uf = options.upper.font;
  const uw = options.upper.weight;
  const lf = options.lower.font;
  const lw = options.lower.weight;

  // set canvas
  const canvas = createCanvas(270, 270);
  const ctx = canvas.getContext('2d');

  ctx.font = `${uw} 100px ${uf}`;
  const upperWidth = ctx.measureText(upper).width;
  ctx.font = `${lw} 100px ${lf}`;
  const lowerWidth = ctx.measureText(lower).width;
  const offsetWidth = options.offsetX;

  canvas.height = 270;
  canvas.width = Math.max(upperWidth + 80, lowerWidth + offsetWidth + 90);
  ctx.lineJoin = 'round';
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(1, 0, -0.4, 1, 0, 0);

  // define auxillary variables
  let posx, posy, grad;

  // generate upper text
  ctx.font = `${uw} 100px ${uf}`;

  posx = 70;
  posy = 100;

  ctx.strokeStyle = '#000';
  ctx.lineWidth = 18;
  ctx.strokeText(upper, posx + 4, posy + 3);

  grad = ctx.createLinearGradient(0, 24, 0, 122);
  grad.addColorStop(0.0, 'rgb(0,15,36)');
  grad.addColorStop(0.1, 'rgb(255,255,255)');
  grad.addColorStop(0.18, 'rgb(55,58,59)');
  grad.addColorStop(0.25, 'rgb(55,58,59)');
  grad.addColorStop(0.5, 'rgb(200,200,200)');
  grad.addColorStop(0.75, 'rgb(55,58,59)');
  grad.addColorStop(0.85, 'rgb(25,20,31)');
  grad.addColorStop(0.91, 'rgb(240,240,240)');
  grad.addColorStop(0.95, 'rgb(166,175,194)');
  grad.addColorStop(1, 'rgb(50,50,50)');
  ctx.strokeStyle = grad;
  ctx.lineWidth = 17;
  ctx.strokeText(upper, posx + 4, posy + 3);

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 10;
  ctx.strokeText(upper, posx, posy);

  grad = ctx.createLinearGradient(0, 20, 0, 100);
  grad.addColorStop(0, 'rgb(253,241,0)');
  grad.addColorStop(0.25, 'rgb(245,253,187)');
  grad.addColorStop(0.4, 'rgb(255,255,255)');
  grad.addColorStop(0.75, 'rgb(253,219,9)');
  grad.addColorStop(0.9, 'rgb(127,53,0)');
  grad.addColorStop(1, 'rgb(243,196,11)');
  ctx.strokeStyle = grad;
  ctx.lineWidth = 8;
  ctx.strokeText(upper, posx, posy);

  ctx.lineWidth = 4;
  ctx.strokeStyle = '#000';
  ctx.strokeText(upper, posx + 2, posy - 2);

  ctx.lineWidth = 4;
  ctx.strokeStyle = '#FFFFFF';
  ctx.strokeText(upper, posx, posy - 2);

  grad = ctx.createLinearGradient(0, 20, 0, 100);
  grad.addColorStop(0, 'rgb(255, 100, 0)');
  grad.addColorStop(0.5, 'rgb(123, 0, 0)');
  grad.addColorStop(0.51, 'rgb(240, 0, 0)');
  grad.addColorStop(1, 'rgb(5, 0, 0)');
  ctx.lineWidth = 1;
  ctx.fillStyle = grad;
  ctx.fillText(upper, posx, posy - 2);

  grad = ctx.createLinearGradient(0, 20, 0, 100);
  grad.addColorStop(0, 'rgb(230, 0, 0)');
  grad.addColorStop(0.5, 'rgb(230, 0, 0)');
  grad.addColorStop(0.51, 'rgb(240, 0, 0)');
  grad.addColorStop(1, 'rgb(5, 0, 0)');
  ctx.strokeStyle = grad;
  ctx.strokeText(upper, posx, posy - 2);

  // generate lower text
  ctx.font = `${lw} 100px ${lf}`;

  const offsetX = offsetWidth;
  const offsetY = 130;
  posx = offsetX + 130;
  posy = offsetY + 100;

  ctx.strokeStyle = '#000';
  ctx.lineWidth = 17;
  ctx.strokeText(lower, posx + 4, posy + 3);

  grad = ctx.createLinearGradient(
    0 + offsetX,
    20 + offsetY,
    0 + offsetX,
    118 + offsetY,
  );
  grad.addColorStop(0, 'rgb(0,15,36)');
  grad.addColorStop(0.25, 'rgb(250,250,250)');
  grad.addColorStop(0.5, 'rgb(150,150,150)');
  grad.addColorStop(0.75, 'rgb(55,58,59)');
  grad.addColorStop(0.85, 'rgb(25,20,31)');
  grad.addColorStop(0.91, 'rgb(240,240,240)');
  grad.addColorStop(0.95, 'rgb(166,175,194)');
  grad.addColorStop(1, 'rgb(50,50,50)');
  ctx.strokeStyle = grad;
  ctx.lineWidth = 14;
  ctx.strokeText(lower, posx + 4, posy + 3);

  ctx.strokeStyle = '#10193A';
  ctx.lineWidth = 12;
  ctx.strokeText(lower, posx, posy);

  ctx.strokeStyle = '#DDD';
  ctx.lineWidth = 7;
  ctx.strokeText(lower, posx, posy);

  grad = ctx.createLinearGradient(
    0 + offsetX,
    20 + offsetY,
    0 + offsetX,
    100 + offsetY,
  );
  grad.addColorStop(0, 'rgb(16,25,58)');
  grad.addColorStop(0.03, 'rgb(255,255,255)');
  grad.addColorStop(0.08, 'rgb(16,25,58)');
  grad.addColorStop(0.2, 'rgb(16,25,58)');
  grad.addColorStop(1, 'rgb(16,25,58)');
  ctx.strokeStyle = grad;
  ctx.lineWidth = 6;
  ctx.strokeText(lower, posx, posy);

  grad = ctx.createLinearGradient(
    0 + offsetX,
    20 + offsetY,
    0 + offsetX,
    100 + offsetY,
  );
  grad.addColorStop(0, 'rgb(245,246,248)');
  grad.addColorStop(0.15, 'rgb(255,255,255)');
  grad.addColorStop(0.35, 'rgb(195,213,220)');
  grad.addColorStop(0.5, 'rgb(160,190,201)');
  grad.addColorStop(0.51, 'rgb(160,190,201)');
  grad.addColorStop(0.52, 'rgb(196,215,222)');
  grad.addColorStop(1.0, 'rgb(255,255,255)');
  ctx.fillStyle = grad;
  ctx.fillText(lower, posx, posy - 3);

  // output canvas
  return canvas;
};
