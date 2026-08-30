import { createFileRoute, Outlet, getRouteApi } from '@tanstack/react-router'
import { getOptionalUser } from '@/features/auth/middleware'
import { SiteNav } from '@/components/marketing/site-nav'
import { Footer } from '@/components/marketing/footer'

const rootRoute = getRouteApi('__root__')

export const Route = createFileRoute('/{-$locale}/blog')({
  loader: async () => {
    const user = await getOptionalUser()
    return { loggedIn: !!user }
  },
  head: () => ({
    meta: [
      { title: '博客 — 每天出海一小时' },
      { name: 'description', content: '每天出海一小时，记录有意义的 Web 出海实践。' },
    ],
  }),
  component: BlogLayout,
})

/**
 * 博客共用布局：只负责导航、页面背景和页足，具体内容交给列表页或详情页。
 * 这样访问 /blog/2.html 时，子路由可以真正替换列表内容。
 */
function BlogLayout() {
  const { loggedIn } = Route.useLoaderData()
  const { theme } = rootRoute.useLoaderData()

  // 博客内容通过 Outlet 渲染，用独立的弹性区域把页足推到短页面底部。
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <SiteNav theme={theme} loggedIn={loggedIn} />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  )
}
