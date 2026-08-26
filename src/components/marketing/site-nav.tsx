import { Link } from '@tanstack/react-router'
import { Logo } from '@/components/brand/logo'
import { buttonVariants } from '@/components/ui/button'
import { ThemeToggle } from '@/features/theme/theme-toggle'
import { useTranslation } from '@/features/i18n/provider'

/** 首页顶部导航：只保留品牌、主题切换和核心打卡入口，减少无关跳转。 */
export function SiteNav({ theme, loggedIn }: { theme: 'light' | 'dark'; loggedIn: boolean }) {
  const { t } = useTranslation()

  const cta = loggedIn ? (
    <Link to="/{-$locale}/app" className={buttonVariants({ size: 'sm' })}>
      {t('marketing.heroCtaPrimary')}
    </Link>
  ) : (
    <Link to="/{-$locale}/register" className={buttonVariants({ size: 'sm' })}>
      {t('marketing.heroCtaPrimary')}
    </Link>
  )

  return (
    <header
      className="border-b border-border backdrop-blur"
      style={{ background: 'color-mix(in srgb, var(--background) 82%, transparent)' }}
    >
      <nav className="flex h-16 items-center gap-3 px-4 md:px-7">
        <Link to="/{-$locale}" aria-label="每天出海一小时（打卡）" className="shrink-0">
          <Logo />
        </Link>
        <div className="flex-1" />

        <div className="flex items-center gap-1">
          <ThemeToggle theme={theme} />
        </div>
        <div>{cta}</div>
      </nav>
    </header>
  )
}
