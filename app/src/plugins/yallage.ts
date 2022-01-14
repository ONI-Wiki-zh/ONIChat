import { Context, sleep } from 'koishi';
import { Item } from 'prismarine-item';
import { Entity } from 'prismarine-entity';
import { TagType } from 'prismarine-nbt';
import { Dispenser } from 'mineflayer';
import { createCanvas, loadImage } from 'canvas';
import { createHash } from 'crypto';

const SERVER = '生存一服';
const COLORS = [
  '#F44336',
  '#E91E63',
  '#9C27B0',
  '#673AB7',
  '#3F51B5',
  '#2196F3',
  '#03A9F4',
  '#00BCD4',
  '#009688',
  '#4CAF50',
  '#8BC34A',
  '#CDDC39',
  '#FFEB3B',
  '#FFC107',
  '#FF9800',
  '#FF5722',
  '#795548',
  '#9E9E9E',
  '#607D8B',
];

export const using = ['assets'] as const;
export async function apply(ctx: Context): Promise<void> {
  const avatars: string[] = [];

  // ctx.using(['assets'], async (ctx) => {
  //   const baseImage = await loadImage(`${__dirname}/../assets/Steve_JE.png`);
  //   for (const color of COLORS) {
  //     const canvas = createCanvas(128, 128);
  //     const cCtx = canvas.getContext('2d');
  //     cCtx.fillStyle = color;
  //     cCtx.fillRect(0, 0, canvas.width, canvas.height);
  //     cCtx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
  //     const bufferStr = canvas.toBuffer().toString('base64');
  //     const url = `base64://${bufferStr}`;
  //     const remoteUrl = await ctx.assets.upload(url, 'seteve-' + color);
  //     console.log(remoteUrl);
  //     avatars.push(remoteUrl);
  //   }
  // });

  ctx.on('minecraft/before-message', (session) => {
    if (!session) return;
    if (session.author?.userId === '_') {
      console.warn(session.content);
      if (
        session.content?.startsWith('[1] ') ||
        session.content?.startsWith('[2] ')
      )
        return;
    }

    // ctx.using(['assets'], async (ctx) => {
    //   if (session.author && session.author?.userId !== '_') {
    //     const userId = session.author.userId;
    //     const hash = createHash('sha1')
    //       .update(userId)
    //       .digest('hex')
    //       .substring(0, 8);
    //     const idx = parseInt(hash, 16) % avatars.length;
    //     session.author.avatar = avatars[idx];
    //   }
    // });

    return session;
  });

  ctx.on('minecraft/before-listen', async (mcBot) => {
    const bot = mcBot.flayer;
    let citEntity: Entity | undefined = undefined;
    for (const e of Object.values(bot.entities)) {
      if (e?.username?.startsWith('CIT-')) citEntity = e;
    }
    if (!citEntity) throw new Error('Can not find CIT entity');

    const ow = (await bot.openContainer(citEntity)) as Dispenser;
    const slots: Item[] = (ow as any).slots;
    const options: Record<string, Item> = {};
    for (const i of slots) {
      if (
        i?.nbt?.type === TagType.Compound &&
        i.nbt?.value?.display?.type === TagType.Compound
      ) {
        const value = JSON.parse(
          (i.nbt.value.display.value as any)?.Name?.value,
        );
        const title = value?.extra?.[0]?.text?.trim();
        if (title) options[title] = i;
      }
    }
    ow.withdraw(options[SERVER].type, null, null);

    await new Promise<void>((res, rej) => {
      bot.once('spawn', async () => {
        mcBot.logger.success(`Joined ${SERVER}`);
        await sleep(10000);
        res();
      });
    });
    return;
  });
};
