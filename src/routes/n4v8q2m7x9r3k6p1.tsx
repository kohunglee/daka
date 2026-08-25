/**
 * 隐藏的打卡清理入口。
 * 不挂入站内导航和 sitemap，仅用于管理员按用户 ID + 日期清理 D1/R2。
 */
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Search, ShieldAlert, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatBeijingDate } from '@/features/checkin/checkin.shared'
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
  loader: () => getAdminClearSessionFn(),
  head: () => ({
    meta: [
      { title: 'Admin' },
      { name: 'robots', content: 'noindex, nofollow, noarchive' },
    ],
  }),
  component: HiddenAdminPage,
})

/** 隐藏管理员页面：先密码登录，再搜索用户、预览并清空单日记录。 */
function HiddenAdminPage() {
  const session = Route.useLoaderData()
  const router = useRouter()

  if (!session.authenticated) return <AdminLogin onLoggedIn={() => router.invalidate()} />
  return <AdminClearPanel />
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
            <h1 className="m-0 text-xl font-semibold">管理入口</h1>
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
function AdminClearPanel() {
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

  /** 读取管理员记录总表的指定分页。 */
  async function loadRecords(page: number) {
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
  }

  useEffect(() => {
    void loadRecords(0)
  }, [])

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
    <AdminFrame>
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
              <div><dt className="text-xs text-fg-3">出海 / 外链 / 质量</dt><dd className="m-0">{preview.hours} 小时 / {preview.backlinks} 条 / {preview.quality}/10</dd></div>
            </dl>
            <p className="m-0 break-all text-xs text-fg-3">R2：{preview.imageKey}</p>
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
                <span className="text-xs text-fg-3">{row.hours} 小时 · {row.backlinks} 外链 · 质量 {row.quality}/10</span>
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
    </AdminFrame>
  )
}

/** 管理员页统一外框，避免进入普通用户导航和登录体系。 */
function AdminFrame({ children }: { children: ReactNode }) {
  return <main className="min-h-screen bg-background px-5 py-12 text-foreground"><div className="mx-auto w-full max-w-2xl">{children}</div></main>
}
