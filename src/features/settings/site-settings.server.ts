import { eq } from 'drizzle-orm'
import type { DB } from '@/db/client'
import { siteSettings } from './site-settings.schema'
import { DEFAULT_SETTINGS_JSON, readTestSettings, updateTestSettingsJson, type TestSettingsView } from './settings.shared'

/** 全站配置固定使用的单行主键。 */
const GLOBAL_SITE_SETTINGS_ID = 'global'

/** 666 管理中心可读取的全站配置测试视图。 */
export type SiteSettingsView = TestSettingsView

/** 读取全站单行设置；迁移异常或旧库缺行时会安全补齐默认配置。 */
export async function getSiteSettings(db: DB): Promise<SiteSettingsView> {
  const row = await getOrCreateSiteSettingsRow(db)
  return readTestSettings(row.settingsJson)
}

/** 更新全站测试开关，并保留 JSON 中由未来功能写入的未知键。 */
export async function setSiteTestSetting(db: DB, testEnabled: boolean): Promise<SiteSettingsView> {
  const row = await getOrCreateSiteSettingsRow(db)
  const settingsJson = updateTestSettingsJson(row.settingsJson, testEnabled)
  await db
    .update(siteSettings)
    .set({ settingsJson, updatedAt: new Date() })
    .where(eq(siteSettings.id, GLOBAL_SITE_SETTINGS_ID))
  return readTestSettings(settingsJson)
}

/** 取得全站设置行；onConflictDoNothing 处理并发首次读取时的重复初始化。 */
async function getOrCreateSiteSettingsRow(db: DB) {
  const existingRows = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.id, GLOBAL_SITE_SETTINGS_ID))
    .limit(1)
  if (existingRows[0]) return existingRows[0]

  await db
    .insert(siteSettings)
    .values({ id: GLOBAL_SITE_SETTINGS_ID, settingsJson: DEFAULT_SETTINGS_JSON })
    .onConflictDoNothing()

  const createdRows = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.id, GLOBAL_SITE_SETTINGS_ID))
    .limit(1)
  const created = createdRows[0]
  if (!created) throw new Error('全站配置初始化失败。')
  return created
}
