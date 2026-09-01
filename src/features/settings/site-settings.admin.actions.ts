import { createServerFn } from '@tanstack/react-start'
import { createDb } from '@/db/client'
import { env } from '@/lib/env'
import { requireAdminSession } from '@/features/admin-clear/admin-clear.auth.server'
import { MAX_CUSTOM_FOOTER_HTML_LENGTH } from './settings.shared'
import { getPublicCustomFooterHtml, getSiteSettings, setSiteCustomFooterHtml, setSiteTestSetting } from './site-settings.server'

/** 仅隐藏管理员会话可以读取全站配置，不向普通站点页面下发完整 JSON。 */
export const getSiteSettingsForAdminFn = createServerFn({ method: 'GET' })
  .handler(async () => {
    await requireAdminSession()
    return getSiteSettings(createDb(env.DB))
  })

/** 仅隐藏管理员会话可以更新全站测试设置；666 模式的前端开关不承担鉴权职责。 */
export const setSiteTestSettingForAdminFn = createServerFn({ method: 'POST' })
  .validator((data: { enabled?: unknown }) => ({ enabled: data?.enabled === true }))
  .handler(async ({ data }) => {
    await requireAdminSession()
    return setSiteTestSetting(createDb(env.DB), data.enabled)
  })

/** 仅隐藏管理员会话能写入全站 Footer HTML；它会在每个访客页面中执行。 */
export const setSiteCustomFooterHtmlForAdminFn = createServerFn({ method: 'POST' })
  .validator((data: { html?: unknown }) => {
    const html = typeof data?.html === 'string' ? data.html : ''
    if (html.length > MAX_CUSTOM_FOOTER_HTML_LENGTH) {
      throw new Error(`Footer HTML 不能超过 ${MAX_CUSTOM_FOOTER_HTML_LENGTH.toLocaleString()} 个字符。`)
    }
    return { html }
  })
  .handler(async ({ data }) => {
    await requireAdminSession()
    return setSiteCustomFooterHtml(createDb(env.DB), data.html)
  })

/** 公开页面只读取 Footer HTML；该字段的用途就是交给所有访客浏览器执行。 */
export const getPublicCustomFooterHtmlFn = createServerFn({ method: 'GET' })
  .handler(async () => getPublicCustomFooterHtml(createDb(env.DB)))
