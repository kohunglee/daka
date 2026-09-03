import { createFileRoute, Outlet, getRouteApi } from '@tanstack/react-router'
import { getOptionalUser } from '@/features/auth/middleware'
import { SiteNav } from '@/components/marketing/site-nav'
import { Footer } from '@/components/marketing/footer'

const rootRoute = getRouteApi('__root__')

/** 广场共用公开布局：列表页和个人小主页都沿用首页导航与页足。 */
export const Route = createFileRoute('/{-$locale}/plaza')({
  loader: async () => {
    const user = await getOptionalUser()
    return { loggedIn: !!user }
  },
  head: () => ({
    meta: [
      { title: '广场 — 每天出海一小时' },
      { name: 'description', content: '看看正在坚持 Web 出海的朋友。' },
    ],
  }),
  component: PlazaLayout,
})

function PlazaLayout() {
  const { loggedIn } = Route.useLoaderData()
  const { theme } = rootRoute.useLoaderData()

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
