import { createRootRoute, HeadContent, Outlet, Scripts, useParams, useRouterState } from '@tanstack/react-router'
import { isLocale, defaultLocale } from '@/features/i18n/locale'
import { getPreferences } from '@/server/preferences'
import { getOptionalUser } from '@/features/auth/middleware'
import { getAnalyticsToken } from '@/features/analytics/analytics'
import { getPublicCustomFooterHtmlFn, getPublicCustomHeadHtmlFn } from '@/features/settings/site-settings.admin.actions'
import { Toaster } from '@/components/ui/sonner'
import { AreaEditorProvider } from '@/components/editor/area-editor-provider'
import { CustomHeadHtml } from '@/components/marketing/custom-head-html'
import { useResolvedTheme } from '@/features/theme/use-resolved-theme'
import appCss from '@/styles/app.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: '每天出海一小时' },
      { name: 'description', content: '开源的 Cloudflare 原生 SaaS 模板，克隆即可部署到 Workers。' },
      { property: 'og:title', content: '每天出海一小时' },
      { property: 'og:description', content: '开源的 Cloudflare 原生 SaaS 模板，克隆即可部署到 Workers。' },
      { property: 'og:type', content: 'website' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
      { rel: 'icon', type: 'image/png', href: '/logo192.png', sizes: '192x192' },
      { rel: 'apple-touch-icon', href: '/logo192.png' },
      { rel: 'manifest', href: '/manifest.json' },
    ],
  }),
  loader: async () => {
    // Never throw here: if the root loader errors, the error page replaces
    // RootComponent — i.e. the <html>/<head> shell and stylesheet — and every
    // page on the site renders as an unstyled fragment. All three values are
    // cosmetic/optional (theme cookie, header user, analytics token), so a
    // failure (e.g. a D1 blip in getOptionalUser) degrades to defaults instead.
    try {
      const { theme, themeFromCookie } = await getPreferences()
      const user = await getOptionalUser()
      const analyticsToken = await getAnalyticsToken()
      const customFooterHtml = await getPublicCustomFooterHtmlFn()
      const customHeadHtml = await getPublicCustomHeadHtmlFn()
      return { theme, themeFromCookie, user, analyticsToken, customFooterHtml, customHeadHtml }
    } catch {
      return { theme: 'dark' as const, themeFromCookie: false, user: null, analyticsToken: null, customFooterHtml: '', customHeadHtml: '' }
    }
  },
  component: RootComponent,
})

/* Pre-paint theme resolution for cookie-less visitors: SSR defaults to dark
 * (brand), this flips to light when the OS prefers it — before first paint, so
 * there is no flash. It deliberately does NOT write a cookie: visitors keep
 * following their system until they click the toggle (which does write one). */
const THEME_BOOT_SCRIPT = `(function(){try{if(!/(?:^|;\\s*)theme=/.test(document.cookie)&&matchMedia('(prefers-color-scheme: light)').matches){document.documentElement.classList.replace('dark','light')}}catch(e){}})()`

function RootComponent() {
  const { theme, analyticsToken, customHeadHtml } = Route.useLoaderData()
  const params = useParams({ strict: false }) as { locale?: string }
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  // Validate before use: on 404s the optional {-$locale} param swallows the
  // first path segment, so `/no-such-page` would otherwise become lang="no-such-page".
  // /docs 在 locale 组外且内容目前只有中文——lang 跟内容走，别向搜索引擎/读屏标错语言
  // （docs 翻译成英文时同步改这里）。
  const lang = isLocale(params.locale) ? params.locale : pathname.startsWith('/docs') ? 'zh' : defaultLocale
  const resolvedTheme = useResolvedTheme(theme)
  return (
    <html lang={lang} className={theme} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <HeadContent />
        <CustomHeadHtml html={customHeadHtml} />
      </head>
      <body>
        <Outlet />
        <Scripts />
        {/* 全站 textarea 编辑增强：异步加载失败时自动保留原生输入体验。 */}
        <AreaEditorProvider />
        <Toaster theme={resolvedTheme} />
        {/* Cloudflare Web Analytics — only when a beacon token is configured. */}
        {analyticsToken && (
          <script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={JSON.stringify({ token: analyticsToken })}
          />
        )}
      </body>
    </html>
  )
}
