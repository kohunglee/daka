import { createFileRoute, Outlet, redirect, notFound } from '@tanstack/react-router'
import { I18nProvider } from '@/features/i18n/provider'
import { isLocale, defaultLocale, stripDefaultLocalePrefix, type Locale } from '@/features/i18n/locale'
import { ImpersonationBanner } from '@/features/admin/components/impersonation-banner'

export const Route = createFileRoute('/{-$locale}')({
  beforeLoad: ({ params, location }) => {
    const loc = (params as { locale?: string }).locale
    if (loc === undefined) return                  // 中文无前缀路径
    if (loc === defaultLocale || loc === 'en') {    // 历史 /zh 与 /en URL 都统一到中文无前缀
      // href（不是 pathname）确保 query/hash 在规范化跳转时保留。
      throw redirect({ href: stripDefaultLocalePrefix(location.href) })
    }
    if (!isLocale(loc)) throw notFound()            // unknown segment
  },
  component: LocaleLayout,
})

function LocaleLayout() {
  const { locale } = Route.useParams() as { locale?: string }
  const resolved: Locale = isLocale(locale) ? locale : defaultLocale
  return (<I18nProvider locale={resolved}><ImpersonationBanner /><Outlet /></I18nProvider>)
}
