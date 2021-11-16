/**
 * @author Koishijs(机智的小鱼君) <dragon-fish@qq.com>
 * @license Apache-2.0
 */

import { Context, Tables, Session } from "koishi-core";
import { segment, Logger } from "koishi-utils";
import Mwbot from 'mwbot'
import axios from 'axios'
import cheerio from 'cheerio'
import { stringify } from 'qs'
import { } from "koishi-adapter-discord";
import { } from "koishi-adapter-onebot";
import { } from 'koishi-plugin-mysql'

const logger = new Logger("mediawiki");

declare module 'koishi-core' {
  interface Channel {
    mwApi?: string
  }
}
Tables.extend('channel', {
  fields: {
    mwApi: 'string',
  },
})


function getUrl(base: string, params = {}, script: string = 'index'): string {
  let query = ''
  if (Object.keys(params).length) {
    query = '?' + stringify(params)
  }
  let apiBase = base.replace('/api.php',
    `/${script ? script.trim() : 'index'}.php`
  )
  return apiBase + query
}

function isValidApi(api: string): boolean {
  try {
    const { protocol, pathname } = new URL(api)
    return (protocol.startsWith('http') && pathname.endsWith('/api.php'))
  } catch (err) {
    return false
  }
}

async function searchWiki(session, search: string | undefined) {
  if (!search) {
    session.send('要搜索什么呢？(输入空行或句号取消)')
    search = (await session.prompt(30 * 1000)).trim()
    if (!search || search === '.' || search === '。') return ''
  }

  const bot = new Mwbot({ apiUrl: session?.channel?.mwApi })
  if (!bot) return session.execute('wiki.link')

  const [keyword, results, summarys, links] = await bot.request({
    action: 'opensearch',
    format: 'json',
    search,
    redirects: 'resolve',
    limit: 3
  }, {})

  const msg = []

  if (results.length < 1) {
    return `关键词“${search}”没有匹配结果。`
  }

  for (const [index, item] of results.entries()) {
    if (item === search) { // exact match
      session.execute(`wiki --details ${search}`)
      return
    }
    msg.push(`${index + 1}. ${item}`)
  }
  msg.push('请输入想查看的页面编号。')

  await session.send(msg.join('\n'))
  const answer = parseInt(await session.prompt(30 * 1000))
  if (!isNaN(answer) && results[answer - 1]) {
    session.execute('wiki --details ' + results[answer - 1])
  } else {
    return "搜索结果选择超时或选择无效。"
  }
}

const resolveBrackets = (str: string) => str
  .replace(new RegExp('&#91;', 'g'), '[')
  .replace(new RegExp('&#93;', 'g'), ']')

export interface Config { }

export const name = "mediawiki";
export function apply(ctx: Context, config: Config = {}) {
  // @command wiki
  ctx
    .command('wiki [title:text]', 'MediaWiki 相关功能', {})
    .example('wiki 页面 - 获取页面链接')
    .channelFields(['mwApi'])
    .option('details', '-d 显示页面的更多资讯', { type: 'boolean' })
    .option('quiet', '-q 静默查询', { type: 'boolean' })
    .action(async ({ session, options }, title = '') => {
      const { mwApi } = session.channel
      if (!mwApi)
        return options.quiet ? '' : session.execute('wiki.link')

      if (!title) return getUrl(mwApi)
      let mwBot = new Mwbot({ apiUrl: mwApi })
      const { query, error } = await mwBot.request({
        action: 'query',
        prop: 'extracts|info',
        iwurl: 1,
        titles: title,
        redirects: 1,
        converttitles: 1,
        exchars: '150',
        exlimit: 'max',
        explaintext: 1,
        inprop: 'url|displaytitle'
      }, {})

      if (!query) return `出现了亿点问题${error ? '：' + error : ''}。`

      const { redirects, interwiki, pages } = query
      const msg = []
      let fullbackSearch = false

      let section = title.split("#")[1];
      let anchor = "";
      if (section != undefined) {
        anchor = "#" + encodeURI(section)
      }

      if (interwiki && interwiki.length) {
        msg.push(`跨语言链接：${interwiki?.[0]?.url}${anchor}`)
      } else {
        const thisPage = pages[Object.keys(pages)[0]]
        const {
          pageid,
          title: pageTitle,
          missing,
          invalid,
          // extract,
          // fullurl,
          editurl
        } = thisPage
        msg.push(`您要的“${pageTitle}”：`)
        if (redirects && redirects.length > 0) {
          const { from, to } = redirects[0]
          msg.push(`重定向：[${from}] → [${to}]`)
        }
        if (invalid !== undefined) {
          msg.push(`页面名称不合法：${thisPage.invalidreason || '原因未知'}`)
        } else if (missing !== undefined) {
          msg.push(`${editurl} (页面不存在，以下是搜索结果)`)
          fullbackSearch = true
        } else {
          msg.push(getUrl(mwApi, { curid: pageid }) + anchor)

          // Page Details
          if (options.details) {
            const { parse } = await mwBot.request({
              action: 'parse',
              pageid,
              prop: 'text|wikitext',
              wrapoutputclass: 'mw-parser-output',
              disablelimitreport: 1,
              disableeditsection: 1,
              disabletoc: 1
            }, {})
            const $ = cheerio.load(parse?.text?.['*'] || '')
            const $contents = $('.mw-parser-output > p')
            const extract = $contents.text().trim() || ''
            ctx
              .logger('mediawiki')
              .info({ html: parse.text, $contents, extract })
            // const extract = parse?.wikitext?.['*'] || ''
            if (extract) {
              msg.push(
                extract.length > 150 ? extract.slice(0, 150) + '...' : extract
              )
            }
          }
        }
      }
      await session.send(segment('quote', { id: session.messageId }) + msg.join('\n'))
      if (fullbackSearch) {
        const searchResult = await searchWiki(session, title)
        if (searchResult)
          session.send(searchResult)
      }
    })

  // @command wiki.link
  ctx
    .command('wiki.link [api:string]', '将群聊与 MediaWiki 网站连接', {
      authority: 2
    })
    .channelFields(['mwApi'])
    .option('delete', '-d 将群聊与 MediaWiki 网站解绑')
    .action(async ({ session, options }, api) => {
      const { channel } = session
      if (options.delete) {
        if (!channel.mwApi)
          return '本群尚未与 MediaWiki 网站连接'
        const oldSite: string = channel.mwApi
        channel.mwApi = null
        session.channel._update()
        return `本群已与 ${oldSite} 解绑。`
      }

      if (!api) {
        return channel.mwApi
          ? `本群已与 ${channel.mwApi} 连接。`
          : '本群未连接到 MediaWiki 网站，请使用“wiki.link <api网址>”进行连接。'
      }

      if (isValidApi(api)) {
        channel.mwApi = api
        await session.channel._update()
        return session.execute('wiki.link')
      } else {
        return '输入的不是合法 api.php 网址。'
      }
    })

  // @command wiki.search
  ctx
    .command('wiki.search <search:text>', '通过名称搜索页面')
    .shortcut('搜索wiki', { prefix: false, fuzzy: true })
    .shortcut('查wiki', { prefix: false, fuzzy: true })
    .shortcut('wiki搜索', { prefix: false, fuzzy: true })
    .channelFields(['mwApi'])
    .action(async ({ session }, search) => {
      return await searchWiki(session, search)
    })

  // Shortcut
  ctx.middleware(async (session, next) => {
    await next()
    const content = resolveBrackets(session.content)
    const link = /\[\[(.+?)(?:\|.*)?\]\]/.exec(content)
    const template = /{{(.+?)(?:\|.*)?}}/.exec(content)
    if (link && link[1]) {
      session.execute('wiki --quiet ' + link[1])
    }
    if (template && template[1]) {
      session.execute('wiki --quiet --details ' + template[1])
    }
  })

  // parse
  ctx
    .command('wiki.parse <text:text>', '解析 wiki 标记文本', {
      minInterval: 10 * 1000,
      authority: 3
    })
    .option('title', '-t <title:string> 用于渲染的页面标题')
    .option('pure', '-p 纯净模式')
    .channelFields(['mwApi'])
    .action(async ({ session, options }, text = '') => {
      if (!text) return ''
      text = resolveBrackets(text)
      const { mwApi } = session.channel
      if (!mwApi) return session.execute('wiki.link')
      const bot = new Mwbot({ apiUrl: session?.channel?.mwApi })

      const { parse, error } = await bot.request({
        action: 'parse',
        title: options.title,
        text,
        pst: 1,
        disableeditsection: 1,
        preview: 1
      }, {})

      if (!parse) return `出现了亿点问题${error ? '：' + error : ''}。`

      if (options.pure) {
        // return require('../../Chatbot-SILI/utils/txt2img').shotHtml(
        //   parse?.text?.['*']
        // )
        return parse?.text?.['*']
      }

      const { data } = await axios.get(
        getUrl(mwApi, { title: 'special:blankpage' })
      )
      const $ = cheerio.load(data)

      $('h1').text(parse?.title)
      $('#mw-content-text').html(parse?.text?.['*'])
      $('#mw-content-text').append(
        '<p style="font-style: italic; color: #b00">[注意] 这是由自动程序生成的预览图片，不代表 wiki 观点。</p>'
      )

      // 处理 URL
      function resolveUrl(oldOne) {
        const thisUrl = new URL(getUrl(mwApi, { title: 'special:blankpage' }))
        let newOne = oldOne
        // 处理不是 http:// https:// 或者 // 开头的
        if (!/^(https?:)?\/\//i.test(oldOne)) {
          // 绝对地址
          if (oldOne.startsWith('/')) {
            newOne = thisUrl.origin + oldOne
          }
          // 相对地址
          else {
            let path = thisUrl.pathname
            // 解析一下 url 防止抑郁
            if (!path.endsWith('/')) {
              path = path
                .split('/')
                .slice(0, -1)
                .join('/') + '/'
            }
            newOne = thisUrl.origin + path + oldOne
          }
        }
        return newOne
      }
      $('[src]').attr('src', function () {
        return resolveUrl($(this).attr('src'))
      })
      $('link[href]').attr('href', function () {
        return resolveUrl($(this).attr('href'))
      })

      // return require('../../Chatbot-SILI/utils/txt2img').shotHtml($.html())
      return $.html()
    })
}