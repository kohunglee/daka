import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/** 博客文章表：标题、发布日期和正文都由 D1 持久化，后台可实时维护。 */
export const blogPost = sqliteTable('blog_post', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  publishedAt: integer('published_at', { mode: 'timestamp_ms' }).notNull(),
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
}, (table) => [
  // 公开列表固定按发布日期倒序读取，单独索引避免文章增加后全表排序。
  index('blog_post_publishedAt_idx').on(table.publishedAt),
])

export type BlogPost = typeof blogPost.$inferSelect
