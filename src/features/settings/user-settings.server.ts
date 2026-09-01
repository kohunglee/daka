import { eq } from 'drizzle-orm'
import type { DB } from '@/db/client'
import { user } from '@/features/auth/auth.schema'
import { readTestSettings, updateTestSettingsJson, type TestSettingsView } from './settings.shared'

/** 当前用户可读取的个人配置测试视图。 */
export type UserSettingsView = TestSettingsView

/** 读取一个用户的配置 JSON，并只返回当前已定义且可供页面使用的字段。 */
export async function getUserSettings(db: DB, userId: string): Promise<UserSettingsView> {
  const rows = await db
    .select({ settingsJson: user.settingsJson })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)
  const row = rows[0]
  if (!row) throw new Error('用户不存在。')
  return readTestSettings(row.settingsJson)
}

/** 只写入用户自己的测试设置，数据库原有的未知 JSON 键会被完整保留。 */
export async function setUserTestSetting(db: DB, userId: string, testEnabled: boolean): Promise<UserSettingsView> {
  const rows = await db
    .select({ settingsJson: user.settingsJson })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)
  const row = rows[0]
  if (!row) throw new Error('用户不存在。')

  const settingsJson = updateTestSettingsJson(row.settingsJson, testEnabled)
  await db
    .update(user)
    .set({ settingsJson, updatedAt: new Date() })
    .where(eq(user.id, userId))
  return readTestSettings(settingsJson)
}
