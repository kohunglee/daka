import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { requireUser } from '@/features/auth/middleware'
import { getMyFeedbackFn, submitFeedbackFn, deleteFeedbackFn } from '@/features/feedback/actions'
import { TITLE_MAX, BODY_MAX, OPEN_LIMIT, type FeedbackStatus } from '@/features/feedback/feedback.shared'
import { useTranslation } from '@/features/i18n/provider'
import { AppShell } from '@/components/app/app-shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { fmtDate } from '@/lib/format-date'
import { use666Mode } from '@/features/admin/mode-666'

export const Route = createFileRoute('/{-$locale}/app/feedback')({
  head: () => ({ meta: [{ name: 'robots', content: 'noindex' }] }),
  loader: async ({ params }) => {
    const [user, items] = await Promise.all([
      requireUser({ data: { locale: (params as { locale?: string }).locale } }),
      getMyFeedbackFn(),
    ])
    return { user, items }
  },
  component: FeedbackPage,
})

const STATUS_VARIANT: Record<FeedbackStatus, 'free' | 'pro' | 'ok' | 'warn'> = {
  open: 'warn', planned: 'pro', shipped: 'ok', closed: 'free', // 待办=黄 排期=橙 上线=绿 关闭=灰
}

function FeedbackPage() {
  const { user, items } = Route.useLoaderData()
  const { t } = useTranslation()
  const router = useRouter()
  const { enabled: mode666, ready } = use666Mode()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const openCount = items.filter((f) => f.status === 'open').length
  const atLimit = openCount >= OPEN_LIMIT

  useEffect(() => {
    if (ready && !mode666) void router.navigate({ to: '/{-$locale}/app', replace: true })
  }, [mode666, ready, router])

  if (!ready || !mode666) return null

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const r = await submitFeedbackFn({ data: { title, body } })
      if (!r.ok) {
        if (r.reason === 'limit') toast.error(t('feedback.limitReached', { n: OPEN_LIMIT }))
        else if (r.reason === 'title') toast.error(t('feedback.errTitle', { max: TITLE_MAX }))
        else toast.error(t('feedback.errBody', { max: BODY_MAX }))
        return
      }
      toast.success(t('feedback.submitted'))
      setTitle(''); setBody('')
      void router.invalidate()
    } finally { setBusy(false) }
  }

  async function remove(id: string) {
    if (!window.confirm(t('feedback.deleteConfirm'))) return // 与 deleteAccount 的确认先例对齐
    const { deleted } = await deleteFeedbackFn({ data: { id } })
    if (deleted) { toast.success(t('feedback.deleted')); void router.invalidate() }
    else toast.error(t('feedback.deleteFailed'))
  }

  return (
    <AppShell user={user} active="feedback" crumb={t('feedback.nav')}>
      <div className="mb-6">
        <h1 className="page-h">{t('feedback.title')}</h1>
        <p className="mt-1.5 text-[14.5px] text-fg-2">{t('feedback.subtitle')}</p>
      </div>

      <Card className="max-w-xl p-5">
        <h2 className="m-0 mb-4 text-[15px] font-semibold">{t('feedback.formTitle')}</h2>
        <form onSubmit={submit} className="grid gap-3.5">
          <div className="grid gap-1.5">
            <Label htmlFor="fb-title">{t('feedback.titleLabel')}</Label>
            <Input id="fb-title" value={title} maxLength={TITLE_MAX} required onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="fb-body">{t('feedback.bodyLabel')} <span className="text-fg-3">({t('feedback.optional')})</span></Label>
            <Textarea id="fb-body" value={body} maxLength={BODY_MAX} rows={4} onChange={(e) => setBody(e.target.value)} />
          </div>
          <div>
            <Button type="submit" disabled={busy || atLimit}>{t('feedback.submit')}</Button>
            {atLimit && <p className="mt-2 text-[13px] text-fg-3">{t('feedback.limitReached', { n: OPEN_LIMIT })}</p>}
          </div>
        </form>
      </Card>

      <div className="mt-8 max-w-xl">
        <h2 className="m-0 mb-3 text-[15px] font-semibold">{t('feedback.mineTitle')}</h2>
        {items.length === 0 && <p className="text-sm text-fg-3">{t('feedback.empty')}</p>}
        <div className="grid gap-3">
          {items.map((f) => (
            <Card key={f.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{f.title}</span>
                    <Badge variant={STATUS_VARIANT[f.status as FeedbackStatus] ?? 'free'}>
                      {t(`feedback.status.${f.status}`)}
                    </Badge>
                  </div>
                  {f.body && <p className="mb-0 mt-1.5 text-sm text-fg-2 line-clamp-3">{f.body}</p>}
                  {f.adminNote && (
                    <div className="mt-2.5 border-l-2 border-primary pl-3 text-sm text-fg-2">
                      <span className="mb-0.5 block text-xs text-fg-3">{t('feedback.replyLabel')}</span>
                      {f.adminNote}
                    </div>
                  )}
                  <div className="mt-2 font-mono text-xs text-fg-3">{fmtDate(f.createdAt)}</div>
                </div>
                {f.status === 'open' && (
                  <Button variant="ghost" size="sm" aria-label={t('feedback.deleteBtn')} onClick={() => remove(f.id)}>
                    <Trash2 size={15} />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
