import type { ReactNode } from 'react'
import { BookOpen, Home, ShieldCheck, Trash2 } from 'lucide-react'

interface AdminWorkspaceShellProps {
  children: ReactNode
  activePage: AdminWorkspacePage
  mode666: boolean
  onMode666Change: (enabled: boolean) => void
}

/** 隐藏管理中心目前的页面标识，后续增加功能时继续扩展这里即可。 */
export type AdminWorkspacePage = 'checkins' | 'blog'

/**
 * 隐藏管理员后台的统一外壳。
 *
 * 左侧导航把功能入口和具体页面内容分开，后续新增功能时只需在对应分组
 * 增加一个导航项和一个页面，不会继续把所有管理功能堆在同一张表单里。
 */
export function AdminWorkspaceShell({ children, activePage, mode666, onMode666Change }: AdminWorkspaceShellProps) {
  const isCheckinsPage = activePage === 'checkins'

  return (
    <main className="min-h-screen bg-bg-alt text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[1550px] flex-col md:flex-row">
        <aside className="flex w-full shrink-0 flex-col border-b border-border bg-background md:sticky md:top-0 md:h-screen md:w-64 md:border-b-0 md:border-r">
          <div className="flex h-16 items-center gap-3 border-b border-border px-5">
            <span className="rounded-lg bg-destructive/10 p-2 text-destructive"><ShieldCheck size={19} /></span>
            <div>
              <p className="m-0 text-sm font-semibold">666 管理中心</p>
              <p className="m-0 text-xs text-fg-3">隐藏管理入口</p>
            </div>
          </div>

          <nav className="grid gap-5 p-3" aria-label="管理员功能导航">
            <div className="grid gap-1">
              <p className="mb-1 px-3 text-[11px] font-semibold tracking-wider text-fg-3">数据管理</p>
              <a
                href="/n4v8q2m7x9r3k6p1?page=checkins"
                aria-current={isCheckinsPage ? 'page' : undefined}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-bg-alt hover:text-foreground ${isCheckinsPage ? 'bg-bg-alt font-semibold text-foreground' : 'text-fg-2'}`}
              >
                <Trash2 size={17} className="shrink-0 text-destructive" />
                打卡记录清理
              </a>
            </div>

            <div className="grid gap-1">
              <p className="mb-1 px-3 text-[11px] font-semibold tracking-wider text-fg-3">内容管理</p>
              <a
                href="/n4v8q2m7x9r3k6p1?page=blog"
                aria-current={!isCheckinsPage ? 'page' : undefined}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-bg-alt hover:text-foreground ${!isCheckinsPage ? 'bg-bg-alt font-semibold text-foreground' : 'text-fg-2'}`}
              >
                <BookOpen size={17} className="shrink-0" />
                博客管理
              </a>
            </div>
          </nav>

          <div className="mt-auto grid gap-3 border-t border-border p-4">
            <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
              <span className="font-semibold">开启 666 模式</span>
              <input
                type="checkbox"
                checked={mode666}
                onChange={(event) => onMode666Change(event.target.checked)}
                className="h-4 w-4 accent-primary"
              />
            </label>
            <a href="/" className="flex items-center gap-2 text-sm text-fg-3 transition-colors hover:text-foreground">
              <Home size={16} />
              返回首页
            </a>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="flex h-16 items-center justify-between border-b border-border bg-background px-5 md:px-8">
            <p className="m-0 text-sm font-semibold">管理功能</p>
            <span className="text-xs text-fg-3">当前页面：{isCheckinsPage ? '打卡记录清理' : '博客管理'}</span>
          </header>
          <div className="px-5 py-8 md:px-8 md:py-10">{children}</div>
        </section>
      </div>
    </main>
  )
}
