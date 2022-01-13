import { Context, Channel } from "koishi"

declare module 'koishi' {
  interface Channel {
    autoSilentInit?: number
  }
}


export default (ctx: Context) => {
  const logger = ctx.logger('auto-silent')
  ctx.model.extend('channel', {
    flag: {
      type: 'unsigned',
      initial: Channel.Flag.ignore | Channel.Flag.silent,
    },
    autoSilentInit: 'unsigned'
  })

  ctx.on('attach-channel', async (session) => {
    if (!session?.channelId || !session.platform) throw new Error("No session.");
    const channel = await session.observeChannel(['flag', 'id', 'platform', 'autoSilentInit']);
    if (!['onebot', 'qqguild'].includes(channel.platform) && !channel.autoSilentInit) {
      logger.info(`Non-onebot channel added: ${session.platform} ${session.channelId}`)
      await ctx.database.setChannel(session.platform, session.channelId, {
        flag: 0,
        autoSilentInit: 1,
      })
    }
  }, false)

  ctx
    .command('enable <channelId>', '启用群组', {
      authority: 2,
    })
    .channelFields(['id', 'platform', 'flag'])
    .action(async ({ session }, channelId) => {
      if (!session?.channelId || !session.platform) throw new Error("No session.");
      const channel = await ctx.database.getChannel(session.platform, channelId, ['flag'])
      await ctx.database.setChannel(session.platform, channelId, {
        flag: channel.flag & ((Channel.Flag.ignore | Channel.Flag.silent) ^ ~0)
      })
      return "启用群组成功";
    })
}
