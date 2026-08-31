/**
 * 隐藏的巨大管理员模式入口。
 * 不挂入站内导航和 sitemap，仅用于管理员按用户 ID + 日期清理 D1/R2。
 */
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Search, ShieldAlert, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AdminWorkspaceShell, type AdminWorkspacePage } from '@/features/admin-clear/components/admin-workspace-shell'
import { AdminUsersPanel } from '@/features/admin-clear/components/admin-users-panel'
import { BlogAdminPanel } from '@/features/blog/components/blog-admin-panel'
import { getAdminBlogPostsFn } from '@/features/blog/actions'
import type { BlogPost } from '@/features/blog/blog.schema'
import { displayBacklinkOption, displayHoursOption, formatBeijingDate } from '@/features/checkin/checkin.shared'
import { read666Mode, set666Mode } from '@/features/admin/mode-666'
import {
  clearAdminCheckinFn,
  getAdminClearSessionFn,
  loginAdminClearFn,
  listAdminCheckinsFn,
  previewAdminCheckinFn,
  searchAdminClearUsersFn,
  type AdminClearPreview,
  type AdminClearUserRow,
} from '@/features/admin-clear/admin-clear.actions'

export const Route = createFileRoute('/n4v8q2m7x9r3k6p1')({
  validateSearch: (search: Record<string, unknown>): { page: AdminWorkspacePage; edit?: string } => {
    const page = search.page === 'blog' ? 'blog' : search.page === 'users' ? 'users' : 'checkins'
    const edit = typeof search.edit === 'string' && search.edit.length > 0 ? search.edit : undefined
    return edit ? { page, edit } : { page }
  },
  loader: () => getAdminClearSessionFn(),
  head: () => ({
    meta: [
      { title: '巨大管理员模式' },
      { name: 'robots', content: 'noindex, nofollow, noarchive' },
    ],
  }),
  component: HiddenAdminPage,
})

/** 隐藏管理员页面：先密码登录，再搜索用户、预览并清空单日记录。 */
function HiddenAdminPage() {
  const session = Route.useLoaderData()
  const { page, edit } = Route.useSearch()
  const router = useRouter()

  if (!session.authenticated) return <AdminLogin onLoggedIn={() => router.invalidate()} />
  return <AdminClearPanel page={page} editId={edit} />
}

/** 密码入口，不显示普通用户登录入口，也不暴露密码配置状态。 */
function AdminLogin({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setMessage(null)
    try {
      const result = await loginAdminClearFn({ data: { password } })
      if (!result.authenticated) {
        setMessage('密码错误。')
        return
      }
      onLoggedIn()
    } catch {
      setMessage('管理员入口暂时不可用，请稍后重试。')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AdminFrame>
      <Card className="mx-auto w-full max-w-md p-6 sm:p-8">
        <div className="mb-6 flex items-start gap-3">
          <span className="rounded-lg bg-soft p-2 text-primary"><ShieldAlert size={22} /></span>
          <div>
            <h1 className="m-0 text-xl font-semibold">巨大管理员模式</h1>
            <p className="mb-0 mt-1 text-sm text-fg-2">请输入管理员密码继续。</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="admin-password">管理员密码</Label>
            <Input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoFocus
            />
          </div>
          <Button type="submit" disabled={busy}>{busy ? '验证中……' : '进入管理页'}</Button>
          {message && <p className="m-0 text-sm text-destructive" role="alert">{message}</p>}
        </form>
      </Card>
    </AdminFrame>
  )
}

/** 已登录后的单条记录清理面板。 */
function AdminClearPanel({ page, editId }: { page: AdminWorkspacePage; editId?: string }) {
  const [mode666, set666ModeState] = useState(false)
  const [modeReady, setModeReady] = useState(false)
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<AdminClearUserRow[]>([])
  const [userId, setUserId] = useState('')
  const [date, setDate] = useState(() => formatBeijingDate())
  const [preview, setPreview] = useState<AdminClearPreview | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [records, setRecords] = useState<AdminClearPreview[]>([])
  const [recordPage, setRecordPage] = useState(0)
  const [recordTotal, setRecordTotal] = useState(0)
  const [recordTotalPages, setRecordTotalPages] = useState(1)
  const [recordsBusy, setRecordsBusy] = useState(true)
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])
  const [blogBusy, setBlogBusy] = useState(false)
  const [blogError, setBlogError] = useState<string | null>(null)

  /** 生成管理员确认卡片使用的图片读取地址，实际对象仍由服务端按 D1 中的 R2 Key 读取。 */
  function getPreviewImageUrl(record: AdminClearPreview): string {
    return `/api/checkins/${encodeURIComponent(record.userId)}/${encodeURIComponent(record.checkinDate)}`
  }

  /** 读取管理员记录总表的指定分页。 */
  const loadRecords = useCallback(async (page: number) => {
    setRecordsBusy(true)
    try {
      const result = await listAdminCheckinsFn({ data: { page } })
      setRecords(result.rows)
      setRecordPage(result.page)
      setRecordTotal(result.total)
      setRecordTotalPages(result.totalPages)
    } catch {
      setMessage('记录列表读取失败，请刷新页面重试。')
    } finally {
      setRecordsBusy(false)
    }
  }, [])

  useEffect(() => {
    if (page === 'checkins') void loadRecords(0)
  }, [loadRecords, page])

  useEffect(() => {
    set666ModeState(read666Mode())
    setModeReady(true)
  }, [])

  /** 只在切换到博客管理时读取文章，避免打开清理页时额外请求博客数据。 */
  const loadBlogPosts = useCallback(async () => {
    setBlogBusy(true)
    setBlogError(null)
    try {
      setBlogPosts(await getAdminBlogPostsFn())
    } catch {
      setBlogError('文章列表读取失败，请刷新页面重试。')
    } finally {
      setBlogBusy(false)
    }
  }, [])

  useEffect(() => {
    if (page === 'blog') void loadBlogPosts()
  }, [loadBlogPosts, page])

  /** 切换首页顶部的巨大管理员模式标识，并将状态保存到当前浏览器。 */
  function handle666ModeChange(enabled: boolean) {
    set666ModeState(enabled)
    set666Mode(enabled)
  }

  async function searchUsers() {
    if (!query.trim()) {
      setUsers([])
      return
    }
    setBusy(true)
    setMessage(null)
    try {
      setUsers(await searchAdminClearUsersFn({ data: { query } }))
    } catch {
      setMessage('用户搜索失败，请重新输入或刷新页面。')
    } finally {
      setBusy(false)
    }
  }

  async function previewRecord() {
    setBusy(true)
    setMessage(null)
    setPreview(null)
    try {
      const result = await previewAdminCheckinFn({ data: { userId, date } })
      setPreview(result)
      if (!result) setMessage('没有找到这个用户在该日期的打卡记录。')
    } catch {
      setMessage('预览失败，管理员会话可能已失效。')
    } finally {
      setBusy(false)
    }
  }

  async function clearRecord() {
    if (!preview || busy) return
    const confirmed = window.confirm(`确定清空 ${preview.userId} 在 ${preview.checkinDate} 的记录和截图吗？此操作不可恢复。`)
    if (!confirmed) return

    setBusy(true)
    setMessage(null)
    try {
      const result = await clearAdminCheckinFn({ data: { userId: preview.userId, date: preview.checkinDate, confirmed: true } })
      if (result.status === 'deleted') {
        setPreview(null)
        setMessage('已同时清除 D1 记录和 R2 图片。')
        await loadRecords(recordPage)
      } else {
        setMessage('记录已经不存在，可能已被其他操作清除。')
      }
    } catch {
      setMessage('清理失败：可能只完成了一部分，请重新预览后重试。')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AdminWorkspaceShell activePage={page} mode666={mode666} onMode666Change={handle666ModeChange}>
      {page === 'blog' ? (
        <BlogAdminPanel
          posts={blogPosts}
          editId={editId}
          modeEnabled={mode666}
          modeReady={modeReady}
          loading={blogBusy}
          errorMessage={blogError}
          onRefresh={loadBlogPosts}
        />
      ) : page === 'users' ? (
        <AdminUsersPanel />
      ) : (
      <>
        <div className="mb-6">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-destructive/10 p-2 text-destructive"><Trash2 size={22} /></span>
          <div>
            <h1 className="m-0 text-2xl font-semibold">打卡记录清理</h1>
            <p className="mb-0 mt-1 text-sm text-fg-2">只清理指定用户指定日期的一条记录和对应截图。</p>
          </div>
        </div>
      </div>

      <Card className="grid gap-5 p-5 sm:p-6">
        <section className="grid gap-3">
          <Label htmlFor="admin-user-search">搜索用户（ID、邮箱或昵称）</Label>
          <div className="flex gap-2">
            <Input id="admin-user-search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void searchUsers() } }} placeholder="输入关键词" />
            <Button type="button" variant="outline" onClick={() => void searchUsers()} disabled={busy}><Search size={16} />搜索</Button>
          </div>
          {users.length > 0 && (
            <div className="grid gap-1 rounded-lg border border-border p-2">
              {users.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className="rounded-md px-3 py-2 text-left text-sm hover:bg-bg-alt"
                  onClick={() => { setUserId(row.id); setUsers([]); setPreview(null) }}
                >
                  <span className="font-semibold">{row.name}</span><span className="ml-2 text-fg-3">{row.email}</span>
                  <span className="mt-0.5 block font-mono text-xs text-fg-3">{row.id}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-end">
          <div className="grid gap-1.5">
            <Label htmlFor="admin-user-id">用户 ID</Label>
            <Input id="admin-user-id" value={userId} onChange={(event) => { setUserId(event.target.value); setPreview(null) }} placeholder="也可以手动粘贴用户 ID" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="admin-checkin-date">打卡日期</Label>
            <Input id="admin-checkin-date" type="date" value={date} onChange={(event) => { setDate(event.target.value); setPreview(null) }} />
          </div>
        </section>

        <Button type="button" variant="outline" onClick={() => void previewRecord()} disabled={busy || !userId || !date}>预览这条记录</Button>

        {preview && (
          <div className="grid gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <p className="m-0 font-semibold text-destructive">请确认以下记录确实要清空</p>
            <dl className="grid gap-2 sm:grid-cols-2">
              <div><dt className="text-xs text-fg-3">用户</dt><dd className="m-0 break-all">{preview.userName ?? '未知'} · {preview.userEmail ?? '无邮箱'}</dd></div>
              <div><dt className="text-xs text-fg-3">日期</dt><dd className="m-0 font-mono">{preview.checkinDate}</dd></div>
              <div><dt className="text-xs text-fg-3">图片大小</dt><dd className="m-0">{Math.ceil(preview.imageBytes / 1024)}KB</dd></div>
              <div><dt className="text-xs text-fg-3">出海 / 外链 / 质量</dt><dd className="m-0">{displayHoursOption(preview.hours)} 小时 / {displayBacklinkOption(preview.backlinks)} 条 / {preview.quality}/10</dd></div>
            </dl>
            <a
              href={getPreviewImageUrl(preview)}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded-md border border-border bg-background transition-opacity hover:opacity-85"
              title="在新窗口打开图片"
            >
              <img
                src={getPreviewImageUrl(preview)}
                alt={`${preview.checkinDate} 打卡截图`}
                className="block max-h-80 w-full object-contain"
                loading="lazy"
              />
            </a>
            <p className="m-0 break-all text-xs text-fg-3">
              R2：{' '}
              <a
                href={getPreviewImageUrl(preview)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:opacity-80"
              >
                {preview.imageKey}
              </a>
            </p>
            <Button type="button" variant="default" className="bg-destructive text-white hover:bg-destructive/90" onClick={() => void clearRecord()} disabled={busy}>
              {busy ? '清理中……' : '确认清空这条记录和图片'}
            </Button>
          </div>
        )}

        {message && <p className="m-0 text-sm text-fg-2" role="status">{message}</p>}
      </Card>

      <Card className="mt-6 p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="m-0 text-lg font-semibold">数据库现有打卡记录</h2>
            <p className="mb-0 mt-1 text-sm text-fg-2">共 {recordTotal} 条，每页 50 条；点击记录可带入上方清理表单。</p>
          </div>
          <span className="font-mono text-xs text-fg-3">第 {recordPage + 1} / {recordTotalPages} 页</span>
        </div>

        {recordsBusy ? (
          <p className="m-0 py-8 text-center text-sm text-fg-3">正在读取记录……</p>
        ) : records.length === 0 ? (
          <p className="m-0 py-8 text-center text-sm text-fg-3">当前数据库没有打卡记录。</p>
        ) : (
          <div className="grid gap-2">
            {records.map((row) => (
              <button
                key={row.id}
                type="button"
                className="grid gap-2 rounded-lg border border-border p-3 text-left transition-colors hover:border-primary hover:bg-bg-alt sm:grid-cols-[150px_minmax(0,1fr)_180px_120px] sm:items-center"
                onClick={() => {
                  setUserId(row.userId)
                  setDate(row.checkinDate)
                  setPreview(row)
                  setMessage(null)
                }}
                title="点击后带入上方清理表单"
              >
                <span className="font-mono text-sm font-semibold text-destructive">{row.checkinDate}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{row.userName ?? '未知用户'}</span>
                  <span className="block truncate text-xs text-fg-3">{row.userEmail ?? row.userId}</span>
                </span>
                <span className="text-xs text-fg-3">{displayHoursOption(row.hours)} 小时 · {displayBacklinkOption(row.backlinks)} 外链 · 质量 {row.quality}/10</span>
                <span className="text-xs text-fg-3">{Math.ceil(row.imageBytes / 1024)}KB</span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <Button type="button" variant="outline" size="sm" disabled={recordsBusy || recordPage === 0} onClick={() => void loadRecords(recordPage - 1)}>上一页</Button>
          <span className="font-mono text-xs text-fg-3">每页 50 条</span>
          <Button type="button" variant="outline" size="sm" disabled={recordsBusy || recordPage + 1 >= recordTotalPages} onClick={() => void loadRecords(recordPage + 1)}>下一页</Button>
        </div>
        </Card>
      </>
      )}
    </AdminWorkspaceShell>
  )
}

/** 管理员页统一外框，避免进入普通用户导航和登录体系。 */
function AdminFrame({ children }: { children: ReactNode }) {
  return <main className="min-h-screen bg-background px-5 py-12 text-foreground"><div className="mx-auto w-full max-w-2xl">{children}</div></main>
}
