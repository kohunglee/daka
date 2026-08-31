import { createFileRoute } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { FileText } from 'lucide-react'
import { toast } from 'sonner'
import { requireUser } from '@/features/auth/middleware'
import { getEntitlement } from '@/features/billing/middleware'
import { AppShell } from '@/components/app/app-shell'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useTranslation } from '@/features/i18n/provider'
import { getMyCheckinLogTemplateFn, saveMyCheckinLogTemplateFn } from '@/features/checkin/log-template.actions'
import { CHECKIN_LOG_TEMPLATE_MAX_LENGTH } from '@/features/checkin/log-template.shared'

export const Route = createFileRoute('/{-$locale}/app/log-template')({
  head: () => ({ meta: [{ title: '日志模板' }, { name: 'robots', content: 'noindex' }] }),
  loader: async ({ params }) => {
    const [user, ent, logTemplate] = await Promise.all([
      requireUser({ data: { locale: (params as { locale?: string }).locale } }),
      getEntitlement(),
      getMyCheckinLogTemplateFn(),
    ])
    return { user, ent, logTemplate }
  },
  component: LogTemplatePage,
})

/** 用户日志模板设置页：保存个人默认文字，不直接改动任何历史打卡记录。 */
function LogTemplatePage() {
  const { user, ent, logTemplate: initialTemplate } = Route.useLoaderData()
  const { t } = useTranslation()
  const [logTemplate, setLogTemplate] = useState(initialTemplate)
  const [busy, setBusy] = useState(false)

  /** 保存模板；下次打开今日打卡时，表单会读取这份最新内容。 */
  async function saveTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      const savedTemplate = await saveMyCheckinLogTemplateFn({ data: { logTemplate } })
      setLogTemplate(savedTemplate)
      toast.success(t('app.logTemplateSaved'))
    } catch {
      toast.error(t('app.logTemplateSaveFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppShell user={user} isPro={ent.plan === 'pro'} active="log-template" paymentFailed={ent.paymentFailed}>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-soft p-2 text-primary"><FileText size={22} /></span>
          <div>
            <h1 className="page-h">{t('app.logTemplate')}</h1>
            <p className="mt-1.5 text-[14.5px] text-fg-2">{t('app.logTemplateSub')}</p>
          </div>
        </div>
        <p className="mb-0 mt-4 max-w-2xl text-sm leading-6 text-fg-2">{t('app.logTemplateIntro')}</p>
      </div>

      <Card className="max-w-2xl p-5 sm:p-6">
        <form className="grid gap-4" onSubmit={saveTemplate}>
          <div className="grid gap-1.5">
            <Label htmlFor="checkin-log-template">{t('app.logTemplateLabel')}</Label>
            <Textarea
              id="checkin-log-template"
              value={logTemplate}
              maxLength={CHECKIN_LOG_TEMPLATE_MAX_LENGTH}
              rows={10}
              onChange={(event) => setLogTemplate(event.target.value)}
              placeholder={t('app.logTemplatePlaceholder')}
            />
            <p className="mb-0 text-xs text-fg-3">{t('app.logTemplateHint')}</p>
          </div>
          <div>
            <Button type="submit" disabled={busy}>{busy ? '保存中……' : t('app.logTemplateSave')}</Button>
          </div>
        </form>
      </Card>
    </AppShell>
  )
}
