import { createServerFn } from '@tanstack/react-start'
import { env } from '@/lib/env'
import { createDb } from '@/db/client'
import { requireAdminSession } from '@/features/admin-clear/admin-clear.auth.server'
import { createBlogPost, deleteBlogPost, listBlogPosts, updateBlogPost, type BlogPostInput } from './blog.server'

/** 公开读取入口：博客内容可直接用于 /blog 的服务端 loader。 */
export const getBlogPostsFn = createServerFn({ method: 'GET' }).handler(async () => {
  return listBlogPosts(createDb(env.DB))
})

/** 管理后台读取入口：即使直接访问管理路由，也必须通过真实管理员校验。 */
export const getAdminBlogPostsFn = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAdminSession()
  return listBlogPosts(createDb(env.DB))
})

/** 管理员文章输入校验：写操作始终由服务端重新校验，不信任浏览器表单。 */
function validateBlogPostInput(data: BlogPostInput): BlogPostInput {
  return {
    title: typeof data?.title === 'string' ? data.title : '',
    publishedAt: typeof data?.publishedAt === 'string' ? data.publishedAt : '',
    content: typeof data?.content === 'string' ? data.content : '',
  }
}

/** 管理员新增博客文章。真实管理员身份由 assertAdmin 负责确认。 */
export const createBlogPostFn = createServerFn({ method: 'POST' })
  .validator((data: BlogPostInput) => validateBlogPostInput(data))
  .handler(async ({ data }) => {
    await requireAdminSession()
    return createBlogPost(createDb(env.DB), data, Date.now())
  })

/** 管理员更新博客文章。 */
export const updateBlogPostFn = createServerFn({ method: 'POST' })
  .validator((data: BlogPostInput & { id: string }) => ({
    id: typeof data?.id === 'string' ? data.id : '',
    ...validateBlogPostInput(data),
  }))
  .handler(async ({ data }) => {
    await requireAdminSession()
    return updateBlogPost(createDb(env.DB), data.id, data, Date.now())
  })

/** 管理员删除博客文章。 */
export const deleteBlogPostFn = createServerFn({ method: 'POST' })
  .validator((data: { id: string }) => ({ id: typeof data?.id === 'string' ? data.id : '' }))
  .handler(async ({ data }) => {
    await requireAdminSession()
    return { deleted: await deleteBlogPost(createDb(env.DB), data.id) }
  })
