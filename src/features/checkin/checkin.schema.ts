import { sql } from 'drizzle-orm'
import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { user } from '@/features/auth/auth.schema'

/**
 * 每日打卡主表。
 * 图片二进制只进入 R2，D1 只保存 R2 Key 和展示所需的元数据。
 */
export const dailyCheckin = sqliteTable(
  'daily_checkin',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
    checkinDate: text('checkin_date').notNull(),
    hours: text('hours').notNull(),
    backlinks: text('backlinks').notNull(),
    quality: integer('quality').notNull(),
    log: text('log').notNull(),
    imageKey: text('image_key').notNull(),
    imageBytes: integer('image_bytes').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
  },
  (table) => [
    uniqueIndex('daily_checkin_user_date_uidx').on(table.userId, table.checkinDate),
  ],
)

export type DailyCheckin = typeof dailyCheckin.$inferSelect
