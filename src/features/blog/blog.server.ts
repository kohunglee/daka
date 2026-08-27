import { desc, eq } from 'drizzle-orm'
import type { DB } from '@/db/client'
import { blogPost, type BlogPost } from './blog.schema'

/** 博客第一版的输入边界：先保证后台误操作不会写入异常大文本。 */
export const BLOG_TITLE_MAX = 200
export const BLOG_CONTENT_MAX = 100_000

export interface BlogPostInput {
  title: string
  publishedAt: string
  content: string
}

/** 把管理表单的 YYYY-MM-DD 转成稳定的 UTC 日期，避免服务器时区造成日期漂移。 */
function parsePublishedAt(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('invalid published date')
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) throw new Error('invalid published date')
  const [yearText, monthText, dayText] = value.split('-')
  if (
    date.getUTCFullYear() !== Number(yearText)
    || date.getUTCMonth() + 1 !== Number(monthText)
    || date.getUTCDate() !== Number(dayText)
  ) throw new Error('invalid published date')
  return date
}

/** 校验并标准化文章输入，创建和更新共用同一套规则。 */
function normalizeInput(input: BlogPostInput): { title: string; publishedAt: Date; content: string } {
  const title = input.title.trim()
  const content = input.content.trim()
  if (!title || title.length > BLOG_TITLE_MAX) throw new Error('invalid blog title')
  if (!content || content.length > BLOG_CONTENT_MAX) throw new Error('invalid blog content')
  return { title, publishedAt: parsePublishedAt(input.publishedAt), content }
}

/** 公开博客列表：不需要登录，按文章时间从新到旧返回。 */
export function listBlogPosts(db: DB): Promise<BlogPost[]> {
  return db.select().from(blogPost).orderBy(desc(blogPost.publishedAt))
}

/** 管理员新增文章，并记录创建/更新时间供后续扩展审计使用。 */
export async function createBlogPost(db: DB, input: BlogPostInput, now: number): Promise<BlogPost> {
  const normalized = normalizeInput(input)
  const post: BlogPost = {
    id: crypto.randomUUID(),
    ...normalized,
    createdAt: new Date(now),
    updatedAt: new Date(now),
  }
  await db.insert(blogPost).values(post)
  return post
}

/** 管理员更新文章；不存在的 ID 直接报错，避免界面误报保存成功。 */
export async function updateBlogPost(db: DB, id: string, input: BlogPostInput, now: number): Promise<BlogPost> {
  const normalized = normalizeInput(input)
  const rows = await db.update(blogPost)
    .set({ ...normalized, updatedAt: new Date(now) })
    .where(eq(blogPost.id, id))
    .returning()
  if (rows.length === 0) throw new Error('blog post not found')
  const [row] = rows
  if (!row) throw new Error('blog post not found')
  return row
}

/** 管理员删除文章；返回布尔值让前端能区分重复点击和真实删除。 */
export async function deleteBlogPost(db: DB, id: string): Promise<boolean> {
  const rows = await db.delete(blogPost).where(eq(blogPost.id, id)).returning({ id: blogPost.id })
  return rows.length > 0
}
