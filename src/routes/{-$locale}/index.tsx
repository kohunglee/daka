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
      title: 'FlareStarter',
      description:
        locale === 'zh'
          ? 'FlareStarter——Cloudflare 原生的 SaaS 起步模板。克隆即用，部署到 Workers。'
          : 'FlareStarter — the Cloudflare-native SaaS starter. Clone it and ship on Workers.',
    })
    return { meta, links }
  },
  component: Home,
})

function Home() {
  const { theme, user } = rootRoute.useLoaderData()
  const loggedIn = !!user

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteNav theme={theme} loggedIn={loggedIn} />
      {/* 首页正文：打卡系统 MVP 的全年日历占位 */}
      <main className="flex-1" aria-label="Main content">
        <YearCalendar userId={user?.id ?? null} />
      </main>
      <Footer />
    </div>
  )
}
