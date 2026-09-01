import { sql } from 'drizzle-orm'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { DEFAULT_SETTINGS_JSON } from './settings.shared'

/**
 * 全站唯一配置表。
 *
 * 固定使用 id = "global" 的单条记录；JSON 专门容纳低频全站配置，密钥和凭证
 * 仍必须放在环境变量或专用安全存储中。
 */
export const siteSettings = sqliteTable('site_settings', {
  id: text('id').primaryKey(),
  settingsJson: text('settings_json').default(DEFAULT_SETTINGS_JSON).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
})
