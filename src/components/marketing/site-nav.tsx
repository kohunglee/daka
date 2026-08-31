import { Link } from '@tanstack/react-router'
import { Logo } from '@/components/brand/logo'
import { buttonVariants } from '@/components/ui/button'
import { use666Mode } from '@/features/admin/mode-666'
import { ThemeToggle } from '@/features/theme/theme-toggle'
import { useTranslation } from '@/features/i18n/provider'

/** 首页顶部导航：只保留品牌、主题切换和核心打卡入口，减少无关跳转。 */
export function SiteNav({ theme, loggedIn }: { theme: 'light' | 'dark'; loggedIn: boolean }) {
  const { t } = useTranslation()
  const { enabled: mode666 } = use666Mode()

  const cta = loggedIn ? (
    <Link to="/{-$locale}/app/account" className={buttonVariants({ size: 'sm' })}>
      {t('marketing.navCtaLoggedIn')}
    </Link>
  ) : (
    <Link to="/{-$locale}/register" className={buttonVariants({ size: 'sm' })}>
      {t('marketing.navCtaLoggedOut')}
    </Link>
  )

  return (
    <header
      className="border-b border-border backdrop-blur"
      style={{ background: 'color-mix(in srgb, var(--background) 82%, transparent)' }}
    >
      <nav className="relative mx-auto flex h-16 w-full max-w-[1450px] items-center gap-3 px-4 md:px-7">
        <Link to="/{-$locale}" aria-label="每天出海一小时（打卡）" className="shrink-0">
          <Logo />
        </Link>
        <div className="flex-1" />

        {mode666 && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 max-w-[45%] -translate-x-1/2 -translate-y-1/2 truncate rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive sm:text-sm">
            666模式
          </div>
        )}

        <Link to="/{-$locale}/blog" className="px-2 py-1 text-sm text-fg-2 transition-colors hover:text-foreground">
          博客
        </Link>
        <a
          href="https://daka.run/blog/1.html"
          target="_blank"
          rel="noopener noreferrer"
          className="px-2 py-1 text-sm text-fg-2 transition-colors hover:text-foreground"
        >
          关于
        </a>
        <div className="flex items-center gap-1">
          <ThemeToggle theme={theme} />
        </div>
        <div>{cta}</div>
      </nav>
    </header>
  )
}
