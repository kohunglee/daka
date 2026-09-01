import { createServerFn } from '@tanstack/react-start'
import { createDb } from '@/db/client'
import { env } from '@/lib/env'
import { requireAdminSession } from '@/features/admin-clear/admin-clear.auth.server'
import { getSiteSettings, setSiteTestSetting } from './site-settings.server'

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
