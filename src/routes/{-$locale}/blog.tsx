import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { getOptionalUser } from '@/features/auth/middleware'
import { getBlogPostsFn } from '@/features/blog/actions'
import { SiteNav } from '@/components/marketing/site-nav'
import { Footer } from '@/components/marketing/footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { fmtDate } from '@/lib/format-date'

const rootRoute = getRouteApi('__root__')

export const Route = createFileRoute('/{-$locale}/blog')({
  loader: async () => {
    const [posts, user] = await Promise.all([getBlogPostsFn(), getOptionalUser()])
    return { posts, loggedIn: !!user }
  },
  head: () => ({
    meta: [
      { title: '博客 — 每天出海一小时' },
      { name: 'description', content: '每天出海一小时，记录有意义的 Web 出海实践。' },
    ],
  }),
  component: BlogPage,
})

/** 公开博客首页：以文章卡片展示数据库中的标题、日期和正文。 */
function BlogPage() {
  const { posts, loggedIn } = Route.useLoaderData()
  const { theme } = rootRoute.useLoaderData()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav theme={theme} loggedIn={loggedIn} />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <header className="mb-10 text-center">
          <p className="mb-3 text-sm font-semibold tracking-[0.18em] text-primary">WEB 出海记录</p>
          <h1 className="m-0 text-3xl font-bold tracking-tight">博客</h1>
          <p className="mt-2 text-fg-2">记录每天出海一小时里的观察、实践与收获。</p>
        </header>

        {posts.length === 0 ? (
          <p className="text-center text-sm text-fg-3">暂时还没有文章。</p>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <Card key={post.id}>
                <CardHeader>
                  <CardTitle>{post.title}</CardTitle>
                  <p className="m-0 text-sm text-fg-2">{fmtDate(post.publishedAt)}</p>
                </CardHeader>
                <CardContent>
                  <p className="m-0 whitespace-pre-wrap text-[15px] leading-7 text-fg-2">{post.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
