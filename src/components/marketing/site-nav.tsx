import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Logo } from '@/components/brand/logo'
import { buttonVariants } from '@/components/ui/button'
import { ADMIN_MODE_EVENT, readAdminMode } from '@/features/admin/admin-mode'
import { ThemeToggle } from '@/features/theme/theme-toggle'
import { useTranslation } from '@/features/i18n/provider'

/** 首页顶部导航：只保留品牌、主题切换和核心打卡入口，减少无关跳转。 */
export function SiteNav({ theme, loggedIn }: { theme: 'light' | 'dark'; loggedIn: boolean }) {
  const { t } = useTranslation()
  const [adminMode, setAdminMode] = useState(false)

  useEffect(() => {
    /** 同步当前浏览器的管理员模式，兼容同页切换和其他标签页切换。 */
    const syncAdminMode = () => setAdminMode(readAdminMode())
    syncAdminMode()
    window.addEventListener(ADMIN_MODE_EVENT, syncAdminMode)
    window.addEventListener('storage', syncAdminMode)

    return () => {
      window.removeEventListener(ADMIN_MODE_EVENT, syncAdminMode)
      window.removeEventListener('storage', syncAdminMode)
    }
  }, [])

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
      <nav className="relative flex h-16 items-center gap-3 px-4 md:px-7">
        <Link to="/{-$locale}" aria-label="每天出海一小时（打卡）" className="shrink-0">
          <Logo />
        </Link>
        <div className="flex-1" />

        {adminMode && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 max-w-[45%] -translate-x-1/2 -translate-y-1/2 truncate rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive sm:text-sm">
            管理员模式
          </div>
        )}

        <div className="flex items-center gap-1">
          <ThemeToggle theme={theme} />
        </div>
        <div>{cta}</div>
      </nav>
    </header>
  )
}
