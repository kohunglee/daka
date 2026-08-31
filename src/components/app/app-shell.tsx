import { useState, type ReactNode } from 'react'
import { Link, getRouteApi } from '@tanstack/react-router'
import { Home, Sparkles, Settings, Gauge, Users, Menu, ClipboardList, Heart, MessageSquare, FileText } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/features/theme/theme-toggle'
import { useTranslation } from '@/features/i18n/provider'
import { PaymentFailedBanner } from '@/features/billing/components/payment-failed-banner'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { use666Mode } from '@/features/admin/mode-666'

const rootRoute = getRouteApi('__root__')

export interface ShellUser {
  name?: string | null
  email: string
  role?: string | null
  image?: string | null
}

function initials(primary: string): string {
  const parts = primary.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return primary.slice(0, 2).toUpperCase()
}

/**
 * Shared sidebar + topbar shell for every signed-in surface. One unified nav:
 * Workspace + Account for everyone, plus an Admin group rendered only for
 * `role === 'admin'` (non-admins get no hint the console exists). Admin routes
 * stay under /admin with their own gate — only the navigation is merged.
 *
 * Desktop keeps a stable left navigation column; mobile uses a temporary drawer.
 */
export function AppShell({
  user,
  isPro,
  active,
  paymentFailed,
  children,
}: {
  user: ShellUser
  isPro?: boolean
  active: string
  paymentFailed?: boolean
  children: ReactNode
}) {
  const { theme } = rootRoute.useLoaderData()
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { enabled: mode666 } = use666Mode()

  // admin pages don't load billing, so the topbar badge shows the role there
  const onAdminPage = active.startsWith('admin-')
  const primary = user.name || user.email
  const secondary = user.email

  const sidebar = () => {
    const item = (isActive: boolean) => `app-nav-item ${isActive ? 'active' : ''}`
    const grp = (text: string) => <div className="grp">{text}</div>
    return (
      <>
        {grp(t('app.navWorkspace'))}
        <Link to="/{-$locale}/app" activeProps={{}} className={item(active === 'dashboard')} title={t('app.dashboard')}>
              <Home size={18} className="shrink-0" />
              {t('app.dashboard')}
            </Link>
        {mode666 && (
          <>
            <Link to="/{-$locale}/app/pro" activeProps={{}} className={item(active === 'pro')} title={t('app.proDemo')}>
              <Sparkles size={18} className="shrink-0" />
              {t('app.proDemo')}
              <Badge variant="pro" className="ml-auto">Pro</Badge>
            </Link>
            <Link to="/{-$locale}/app/feedback" activeProps={{}} className={item(active === 'feedback')} title={t('feedback.nav')}>
              <MessageSquare size={18} className="shrink-0" />
              {t('feedback.nav')}
            </Link>
          </>
        )}
        {grp(t('app.navAccount'))}
        <Link to="/{-$locale}/app/account" activeProps={{}} className={item(active === 'account')} title={t('app.account')}>
          <Settings size={18} className="shrink-0" />
          {t('app.account')}
        </Link>
        {user.role === 'admin' && (
          <>
            {grp(t('admin.navAdmin'))}
            <Link to="/{-$locale}/admin" activeProps={{}} className={item(active === 'admin-dashboard')} title={t('admin.dashboard')}>
              <Gauge size={18} className="shrink-0" />
              {t('admin.dashboard')}
            </Link>
            <Link to="/{-$locale}/admin/users" activeProps={{}} className={item(active === 'admin-users')} title={t('admin.users')}>
              <Users size={18} className="shrink-0" />
              {t('admin.users')}
            </Link>
            <Link to="/{-$locale}/admin/waitlist" activeProps={{}} className={item(active === 'admin-waitlist')} title={t('admin.waitlist')}>
              <ClipboardList size={18} className="shrink-0" />
              {t('admin.waitlist')}
            </Link>
            <Link to="/{-$locale}/admin/sponsors" activeProps={{}} className={item(active === 'admin-sponsors')} title={t('admin.sponsors')}>
              <Heart size={18} className="shrink-0" />
              {t('admin.sponsors')}
            </Link>
            <Link to="/{-$locale}/admin/feedback" activeProps={{}} className={item(active === 'admin-feedback')} title={t('admin.feedbackAdmin')}>
              <MessageSquare size={18} className="shrink-0" />
              {t('admin.feedbackAdmin')}
            </Link>
            {mode666 && (
              <Link to="/{-$locale}/admin/blog" activeProps={{}} className={item(active === 'admin-blog')} title="博客管理">
                <FileText size={18} className="shrink-0" />
                博客管理
              </Link>
            )}
          </>
        )}
        <div className="flex-1" />
        <div className="app-user-card flex items-center gap-2.5 border-t border-border pt-3">
          <Avatar>
            <AvatarImage src={user.image ?? undefined} alt={primary} />
            <AvatarFallback>{initials(primary)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-foreground">{primary}</div>
            <div className="truncate text-xs text-fg-3">{secondary}</div>
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="app-shell-outer">
      {/* 顶部白条铺满视口，内部内容再复用首页的 1450px 对齐规则。 */}
      <div className="app-topbar">
        <div className="app-topbar-inner relative">
          <button
            type="button"
            className="inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg text-fg-2 hover:bg-bg-alt hover:text-foreground md:hidden"
            aria-label="Menu"
            onClick={() => setOpen(true)}
          >
            <Menu size={20} />
          </button>
          <Link to="/{-$locale}" aria-label="返回首页" title="返回首页" className="app-topbar-brand cursor-pointer">
            <Logo />
          </Link>
          {mode666 && (
            <div className="pointer-events-none absolute left-1/2 top-1/2 max-w-[45%] -translate-x-1/2 -translate-y-1/2 truncate rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive sm:text-sm">
              666模式
            </div>
          )}
          <div className="flex-1" />
          {onAdminPage ? (
            <Badge variant="pro" dot className="shrink-0">
              {user.role || 'admin'}
            </Badge>
          ) : (
            <Badge variant={isPro ? 'pro' : 'free'} dot className="shrink-0">
              {isPro ? t('billing.pro') : t('billing.free')}
            </Badge>
          )}
          <ThemeToggle theme={theme} />
        </div>
      </div>

      <div className="app-shell-frame">
        <div className="app-shell-body md:grid md:grid-cols-[248px_1fr]">
          {/* desktop sidebar — the plain-utility wrapper does the hiding: `.app-side`
              sets display:flex in unlayered CSS, which outranks the layered `hidden`
              utility, so `hidden` directly on the aside has no effect on mobile */}
          <div className="app-sidebar-column hidden md:block">
            <aside className="app-side">{sidebar()}</aside>
          </div>

          {/* mobile drawer: the desktop left navigation becomes a temporary panel. */}
          {open && (
            <div className="md:hidden">
              <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setOpen(false)} aria-hidden="true" />
              <aside className="app-side fixed inset-y-0 left-0 z-50 w-[248px]" onClick={() => setOpen(false)}>
                {sidebar()}
              </aside>
            </div>
          )}

          <div className="app-shell-content flex min-w-0 flex-col">
            <div className="app-main">
              <PaymentFailedBanner show={!!paymentFailed} />
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
