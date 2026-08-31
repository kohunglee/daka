import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { user } from '@/features/auth/auth.schema'

/** 用户级打卡配置：一位用户一行，当前只保存第五项日志模板。 */
export const userCheckinSetting = sqliteTable('user_checkin_setting', {
  userId: text('user_id').primaryKey().references(() => user.id, { onDelete: 'cascade' }),
  logTemplate: text('log_template').notNull().default(''),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
})

export type UserCheckinSetting = typeof userCheckinSetting.$inferSelect
