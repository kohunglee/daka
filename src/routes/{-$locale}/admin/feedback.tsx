import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { authClient } from '@/features/auth/auth.client'
import { AppShell } from '@/components/app/app-shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useTranslation } from '@/features/i18n/provider'
import { fmtDateTime } from '@/lib/format-date'
import { getFeedbackFn, setFeedbackStatusFn, type AdminFeedbackRow } from '@/features/admin/middleware'
import { FEEDBACK_STATUSES, type FeedbackStatus } from '@/features/feedback/feedback.shared'

interface FeedbackSearch { page?: number; pageSize?: number }

export const Route = createFileRoute('/{-$locale}/admin/feedback')({
  validateSearch: (s: Record<string, unknown>): FeedbackSearch => {
    const out: FeedbackSearch = {}
    if (typeof s.page === 'number') out.page = s.page
    if (typeof s.pageSize === 'number') out.pageSize = s.pageSize
    return out
  },
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getFeedbackFn({ data: { page: deps.page ?? 0, pageSize: deps.pageSize ?? 20 } }),
  component: FeedbackAdmin,
})

// 待办=黄 排期=橙 上线=绿 关闭=灰 —— 与 /app/feedback 的 STATUS_VARIANT 保持一致
const STATUS_VARIANT: Record<FeedbackStatus, 'free' | 'pro' | 'ok' | 'warn'> = {
  open: 'warn', planned: 'pro', shipped: 'ok', closed: 'free',
}

function Row({ r, onSaved }: { r: AdminFeedbackRow; onSaved: () => void }) {
  const { t } = useTranslation()
  const [status, setStatus] = useState<FeedbackStatus>(r.status as FeedbackStatus)
  const [note, setNote] = useState(r.adminNote ?? '')
  const [busy, setBusy] = useState(false)
  async function save() {
    setBusy(true)
    try {
      await setFeedbackStatusFn({ data: { id: r.id, status, adminNote: note } })
      toast.success(t('admin.saved'))
      onSaved()
    } finally { setBusy(false) }
  }
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{r.title}</span>
            <Badge variant={STATUS_VARIANT[r.status as FeedbackStatus] ?? 'free'}>{t(`feedback.status.${r.status}`)}</Badge>
            {r.isPro && <Badge variant="pro">Pro</Badge>}
          </div>
          {r.body && <p className="mb-0 mt-1.5 max-w-[60ch] text-sm text-fg-2 line-clamp-3">{r.body}</p>}
          <div className="mt-2 font-mono text-xs text-fg-3">
            {r.name || '—'} · {r.email || '—'} · {fmtDateTime(r.createdAt)}
          </div>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {/* 原生 select 的箭头浏览器自绘、贴右边框且 focus 是原生蓝框——appearance-none 关掉后
              自绘 lucide 箭头(右间距对齐左侧 12px 内边距)并补设计系统 focus 环 */}
          <div className="relative">
            <select
              className="h-[38px] appearance-none rounded-[7px] border border-input bg-background pl-3 pr-9 text-sm text-foreground"
              value={status}
              onChange={(e) => setStatus(e.target.value as FeedbackStatus)}
            >
              {FEEDBACK_STATUSES.map((s) => <option key={s} value={s}>{t(`feedback.status.${s}`)}</option>)}
            </select>
            <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-fg-3" />
          </div>
          <Input className="h-[38px] w-[220px]" placeholder={t('admin.adminNotePlaceholder')} value={note} onChange={(e) => setNote(e.target.value)} />
          <Button size="sm" disabled={busy} onClick={save}>{t('admin.save')}</Button>
        </div>
      </div>
    </Card>
  )
}

function FeedbackAdmin() {
  const { rows, total } = Route.useLoaderData()
  const search = Route.useSearch()
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const { t } = useTranslation()
  const page = search.page ?? 0
  const pageSize = search.pageSize ?? 20
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  function setSearch(patch: Partial<FeedbackSearch>) {
    void router.navigate({ to: '/{-$locale}/admin/feedback', search: { ...search, ...patch } })
  }
  return (
    <AppShell
      user={{ name: session?.user?.name, email: session?.user?.email ?? '', role: session?.user?.role ?? 'admin', image: session?.user?.image ?? null }}
      active="admin-feedback"
    >
      <div className="mb-5">
        <h1 className="page-h">{t('admin.feedbackAdmin')} ({total})</h1>
        <p className="mt-1.5 text-[14.5px] text-fg-2">{t('admin.feedbackSub')}</p>
      </div>
      {rows.length === 0 && <p className="text-sm text-fg-3">{t('feedback.empty')}</p>}
      <div className="grid max-w-3xl gap-3">
        {rows.map((r) => <Row key={r.id} r={r} onSaved={() => void router.invalidate()} />)}
      </div>
      <div className="mt-4 flex max-w-3xl items-center justify-end gap-2">
        <span className="text-sm text-fg-3">{t('admin.pageOf', { page: page + 1, total: totalPages })}</span>
        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setSearch({ page: page - 1, pageSize })}><ChevronLeft size={15} /></Button>
        <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setSearch({ page: page + 1, pageSize })}><ChevronRight size={15} /></Button>
      </div>
    </AppShell>
  )
}
