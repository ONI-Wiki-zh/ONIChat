import { Context, Channel, Schema, segment } from 'koishi';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { promisify } from 'util';

function escapeScm(str: string): string {
  return str.replace('"', '\\"').replace('\\', '\\\\');
}

const TO_REPLACE_COND = '(gimp-message "JS Interpolation here")';
const TO_REPLACE_IMG = 'IMAGE.xcf';
const GIMP_OUT = 'temp.png';

const scmCond = (cond: string): string => `(cond ${cond})`;

function scmCondItem(name: string, value: string): string {
  const nameEsc = escapeScm(name),
    valueEsc = escapeScm(value);
  return `((equal? "${nameEsc}" curr-name) (gimp-text-layer-set-text curr-layer "${valueEsc}"))`;
}

function replaceScript(
  script: string,
  image: string,
  dict: Record<string, string>,
): string {
  const conditions = [];
  for (const name in dict) {
    conditions.push(scmCondItem(name, dict[name]));
  }
  script = script.replace(TO_REPLACE_IMG, escapeScm(image));
  if (!conditions.length) return script.replace(TO_REPLACE_COND, '');
  return script.replace(TO_REPLACE_COND, scmCond(conditions.join(' ')));
}

type ResolvedConfig = {
  gimpCommand: string;
  imgDir: string;
};

export type Config = Partial<ResolvedConfig>;
export const Config = Schema.object({
  gimpCommand: Schema.string()
    .description('GIMP 命令')
    .default(os.platform() === 'win32' ? 'gimp-console-2.10.exe' : 'gimp'),
  imgDir: Schema.string()
    .description('xcf 图片所在文件夹路径')
    .default('memes'),
});

export const name = 'gimp';
export async function apply(
  ctx: Context,
  config: ResolvedConfig,
): Promise<void> {
  const logger = ctx.logger('gimp');
  const scmTemplate: string = await new Promise<string>((res) => {
    fs.readFile(
      path.join(__dirname, 'script.scm'),
      {
        encoding: 'utf-8',
      },
      (_, code) => res(code),
    );
  });

  ctx
    .command('meme <img> [...args]', '生成梗图')
    .action(async ({ session }, img, ...args) => {
      if (!session) throw new Error('No session.');
      const imagePath = path.join(config.imgDir, `${img}.xcf`);
      if (!fs.existsSync(imagePath)) return `不存在梗图模板 ${img}`;
      const script = replaceScript(
        scmTemplate,
        imagePath,
        args.reduce((o, v, i) => {
          o[`$${i + 1}`] = v;
          return o;
        }, {} as Record<string, string>),
      );
      logger.info(script);
      try {
        const childProcess = spawn(config.gimpCommand, ['-c', '-b', script]);
        childProcess.on('error', (e) => {
          throw e;
        });
        childProcess.stderr.setEncoding('utf-8');
        childProcess.stderr.on('data', (msg) => logger.warn('GIMP error', msg));

        await new Promise((res) => {
          childProcess.on('close', (code) => {
            if (code) throw new Error(`GIMP closed with code ${code}`);
            res(code);
          });
        });
        return segment.image(await promisify(fs.readFile)(GIMP_OUT));
      } catch (e) {
        logger.warn(e);
        return '出了亿点问题';
      }
    });

  ctx.command('meme.list', '列出梗图模板').action(async ({ session }) => {
    const list = await promisify(fs.readdir)(config.imgDir);
    return list
      .filter((f) => f.endsWith('.xcf'))
      .map((f) => f.slice(0, -4))
      .join('\n');
  });
}
