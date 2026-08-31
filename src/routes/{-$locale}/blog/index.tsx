import { createFileRoute, Link } from '@tanstack/react-router'
import { getBlogPostsFn } from '@/features/blog/actions'
import { use666Mode } from '@/features/admin/mode-666'
import { fmtDate } from '@/lib/format-date'

export const Route = createFileRoute('/{-$locale}/blog/')({
  loader: () => getBlogPostsFn(),
  component: BlogIndexPage,
})

/** 公开博客首页：只展示简洁的标题链接和最新更新时间。 */
function BlogIndexPage() {
  const posts = Route.useLoaderData()
  const { enabled: mode666, ready: modeReady } = use666Mode()
  const canEdit = modeReady && mode666

  return (
    <main className="mx-auto w-full max-w-[1450px] px-4 py-16 md:px-7">
      <div className="mx-auto max-w-3xl">
        <header className="mb-10 text-center">
          <h1 className="m-0 text-3xl font-bold tracking-tight">BLOG</h1>
        </header>

        {posts.length === 0 ? (
          <p className="text-center text-sm text-fg-3">暂时还没有文章。</p>
        ) : (
          <div className="divide-y divide-border border-y border-border">
            {posts.map((post) => (
              <div key={post.id} className="flex items-baseline justify-between gap-6 py-4">
                <div className="flex min-w-0 items-baseline gap-3">
                  <Link
                    to="/{-$locale}/blog/$postId"
                    params={{ postId: `${post.publicId}.html` }}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 flex-1 truncate text-[15px] font-medium text-foreground transition-colors hover:text-primary hover:underline"
                  >
                    {post.title}
                  </Link>
                  {canEdit && (
                    <a
                      href={`/n4v8q2m7x9r3k6p1?page=blog&edit=${encodeURIComponent(post.id)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-xs text-fg-3 transition-colors hover:text-primary hover:underline"
                    >
                      编辑
                    </a>
                  )}
                </div>
                <time dateTime={post.updatedAt.toISOString()} className="shrink-0 font-mono text-xs text-fg-3">
                  {fmtDate(post.updatedAt)}
                </time>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
