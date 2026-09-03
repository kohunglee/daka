import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { localeHead } from '@/features/seo/seo'
import { getOrigin } from '@/features/seo/seo.fns'
import type { Locale } from '@/features/i18n/locale'
import { SiteNav } from '@/components/marketing/site-nav'
import { Footer } from '@/components/marketing/footer'
import { YearCalendar } from '@/components/calendar/year-calendar'

const rootRoute = getRouteApi('__root__')

export const Route = createFileRoute('/{-$locale}/')({
  loader: async () => ({ origin: await getOrigin() }),
  head: ({ loaderData, params }) => {
    const origin = loaderData?.origin ?? ''
    const locale = ((params as { locale?: string }).locale ?? 'zh') as Locale
    const { meta, links } = localeHead({
      origin,
      locale,
      path: '/',
      title: '每天出海一小时',
      description:
        locale === 'zh'
          ? '打卡润——Cloudflare 原生的 SaaS 起步模板。克隆即用，部署到 Workers。'
          : '打卡润 — the Cloudflare-native SaaS starter. Clone it and ship on Workers.',
    })
    return { meta, links }
  },
  component: Home,
})

function Home() {
  const { theme, user } = rootRoute.useLoaderData()
  const loggedIn = !!user

  // 使用动态视口高度：短页面让页足贴近底部，长页面仍由正文自然撑开。
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <SiteNav theme={theme} loggedIn={loggedIn} />
      {/* 首页正文：打卡系统 MVP 的全年日历占位 */}
      <main className="flex-1" aria-label="Main content">
        <YearCalendar userId={user?.id ?? null} />
      </main>
      <Footer />
    </div>
  )
}
