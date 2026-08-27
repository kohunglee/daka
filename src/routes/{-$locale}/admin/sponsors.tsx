import { createFileRoute, useRouter } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, EyeOff, Eye } from 'lucide-react'
import { authClient } from '@/features/auth/auth.client'
import { AppShell } from '@/components/app/app-shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTranslation } from '@/features/i18n/provider'
import { fmtDateTime } from '@/lib/format-date'
import { getSponsorshipsFn, setSponsorshipHiddenFn } from '@/features/admin/middleware'

interface SponsorsSearch { page?: number; pageSize?: number }

export const Route = createFileRoute('/{-$locale}/admin/sponsors')({
  validateSearch: (s: Record<string, unknown>): SponsorsSearch => {
    const out: SponsorsSearch = {}
    if (typeof s.page === 'number') out.page = s.page
    if (typeof s.pageSize === 'number') out.pageSize = s.pageSize
    return out
  },
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getSponsorshipsFn({ data: { page: deps.page ?? 0, pageSize: deps.pageSize ?? 20 } }),
  component: SponsorsAdmin,
})

function SponsorsAdmin() {
  const { rows, total } = Route.useLoaderData()
  const search = Route.useSearch()
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const { t } = useTranslation()
  const page = search.page ?? 0
  const pageSize = search.pageSize ?? 20
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  function setSearch(patch: Partial<SponsorsSearch>) {
    void router.navigate({ to: '/{-$locale}/admin/sponsors', search: { ...search, ...patch } })
  }
  async function toggleHidden(id: string, hidden: boolean) {
    await setSponsorshipHiddenFn({ data: { id, hidden } })
    void router.invalidate()
  }

  return (
    <AppShell
      user={{ name: session?.user?.name, email: session?.user?.email ?? '', role: session?.user?.role ?? 'admin', image: session?.user?.image ?? null }}
      active="admin-sponsors"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t('admin.sponsors')} ({total})</h1>
        <a href="/admin/sponsors.csv" className="text-sm text-primary hover:underline">{t('admin.sponsorsExport')}</a>
      </div>
      <p className="mt-1.5 text-[14.5px] text-fg-2">{t('admin.sponsorsSub')}</p>
      <Card className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-fg-3">
              <th className="px-4 py-2">GitHub</th>
              <th className="px-4 py-2">{t('admin.email')}</th>
              <th className="px-4 py-2">{t('admin.amount')}</th>
              <th className="px-4 py-2">{t('admin.status')}</th>
              <th className="px-4 py-2">{t('admin.message')}</th>
              <th className="px-4 py-2">{t('admin.joined')}</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-2 font-mono text-xs">{r.github || '—'}</td>
                <td className="px-4 py-2 font-mono text-xs">{r.email || '—'}</td>
                <td className="px-4 py-2 font-mono">${(r.amount / 100).toFixed(2)}{r.mode === 'recurring' ? t('sponsor.perMo') : ''}</td>
                <td className="px-4 py-2">
                  <span className="font-mono text-xs text-fg-2">{r.status}</span>
                  {r.hidden && <Badge variant="warn" className="ml-2">{t('admin.hiddenBadge')}</Badge>}
                </td>
                <td className="max-w-[220px] truncate px-4 py-2 text-fg-2">{r.message || '—'}</td>
                <td className="px-4 py-2 whitespace-nowrap text-fg-3">{fmtDateTime(r.createdAt)}</td>
                <td className="px-4 py-2">
                  <Button variant="outline" size="sm" onClick={() => toggleHidden(r.id, !r.hidden)}>
                    {r.hidden ? <Eye size={14} /> : <EyeOff size={14} />} {r.hidden ? t('admin.unhide') : t('admin.hide')}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-6 text-sm text-fg-3">{t('sponsor.wallEmpty')}</p>}
      </Card>
      <div className="mt-4 flex items-center justify-end gap-2">
        <span className="text-sm text-fg-3">{t('admin.pageOf', { page: page + 1, total: totalPages })}</span>
        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setSearch({ page: page - 1, pageSize })}><ChevronLeft size={15} /></Button>
        <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setSearch({ page: page + 1, pageSize })}><ChevronRight size={15} /></Button>
      </div>
    </AppShell>
  )
}
