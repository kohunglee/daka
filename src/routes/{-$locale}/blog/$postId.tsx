import { createFileRoute, Link } from '@tanstack/react-router'
import { getBlogPostByPublicIdFn, getBlogPostFn } from '@/features/blog/actions'
import { fmtDateTime } from '@/lib/format-date'
import { renderMarkdown } from '@/lib/markdown'

export const Route = createFileRoute('/{-$locale}/blog/$postId')({
  loader: async ({ params }) => {
    // 新链接使用 1.html；旧链接仍可能是 UUID，因此这里同时兼容两种格式。
    const shortId = /^(\d{1,8})\.html$/.exec(params.postId)?.[1]
    const post = await (
      shortId
        ? getBlogPostByPublicIdFn({ data: { publicId: shortId } })
        : getBlogPostFn({ data: { id: params.postId } })
    )
    return { post }
  },
  component: BlogPostPage,
})

/** 公开文章详情页：从博客目录的新窗口打开，正文只在这里展示。 */
function BlogPostPage() {
  const { post } = Route.useLoaderData()

  return (
    <main className="mx-auto w-full max-w-[1450px] px-4 py-16 md:px-7">
      <div className="mx-auto max-w-3xl">
        {post ? (
          <article>
            <Link to="/{-$locale}/blog" className="text-sm text-fg-3 transition-colors hover:text-primary hover:underline">
              返回文章列表
            </Link>
            <h1 className="mb-3 mt-6 text-3xl font-bold tracking-tight">{post.title}</h1>
            <time dateTime={post.updatedAt.toISOString()} className="font-mono text-xs text-fg-3">
              最近更新：{fmtDateTime(post.updatedAt)}
            </time>
            <div
              className="prose mt-8 max-w-none text-foreground dark:prose-invert prose-headings:text-foreground prose-a:text-primary prose-code:text-foreground"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
            />
          </article>
        ) : (
          <p className="text-center text-sm text-fg-3">这篇文章不存在或已被删除。</p>
        )}
      </div>
    </main>
  )
}
