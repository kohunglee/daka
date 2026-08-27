import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Sparkles, Lock } from 'lucide-react'
import { getEntitlement } from '@/features/billing/middleware'
import { hasProAccess } from '@/features/billing/entitlement'
import { requireUser } from '@/features/auth/middleware'
import { useTranslation } from '@/features/i18n/provider'
import { AppShell } from '@/components/app/app-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { use666Mode } from '@/features/admin/mode-666'

/* Soft-gated Pro area: free users may enter and get a blurred preview with an
 * upgrade CTA (a real "peek" converts better than a redirect). For routes that
 * must never render for free users, use the hard gate instead:
 * `loader: () => requirePlan('pro')()` — it redirects to /pricing. */
export const Route = createFileRoute('/{-$locale}/app/pro')({
  head: () => ({ meta: [{ name: 'robots', content: 'noindex' }] }),
  loader: async ({ params }) => {
    const [user, ent] = await Promise.all([requireUser({ data: { locale: (params as { locale?: string }).locale } }), getEntitlement()])
    return { user, ent }
  },
  component: Pro,
})

function ProContent({ text }: { text: string }) {
  return (
    <Card className="flex flex-col items-center gap-3.5 p-12 text-center">
      <span className="icon-tile" style={{ width: 52, height: 52, borderRadius: 14 }}>
        <Sparkles size={24} />
      </span>
      <p className="m-0 text-base text-fg-2">{text}</p>
    </Card>
  )
}

function Pro() {
  const { user, ent } = Route.useLoaderData()
  const { t } = useTranslation()
  const router = useRouter()
  const { enabled: mode666, ready } = use666Mode()

  useEffect(() => {
    if (ready && !mode666) void router.navigate({ to: '/{-$locale}/app', replace: true })
  }, [mode666, ready, router])

  if (!ready || !mode666) return null

  // feature gate: paid Pro OR admin; the topbar badge stays on ent.plan (billing truth)
  const unlocked = hasProAccess(user.role, ent)
  return (
    <AppShell user={user} isPro={ent.plan === 'pro'} paymentFailed={ent.paymentFailed} active="pro">
      <div className="mb-6 flex items-center gap-2.5">
        <h1 className="page-h">{t('billing.proArea')}</h1>
        <Badge variant="pro">Pro</Badge>
      </div>
      {unlocked ? (
        <ProContent text={t('billing.proOnly')} />
      ) : (
        <div className="relative">
          {/* the real Pro surface, blurred and inert — a genuine peek */}
          <div className="pointer-events-none select-none blur-[6px]" aria-hidden>
            <ProContent text={t('billing.proOnly')} />
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3.5 text-center">
            <span className="icon-tile" style={{ width: 52, height: 52, borderRadius: 14 }}>
              <Lock size={24} />
            </span>
            <p className="m-0 max-w-[26em] text-base text-fg-2">{t('billing.proPeekBody')}</p>
            <Link to="/{-$locale}/pricing">
              <Button>{t('billing.upgrade')}</Button>
            </Link>
          </div>
        </div>
      )}
    </AppShell>
  )
}
