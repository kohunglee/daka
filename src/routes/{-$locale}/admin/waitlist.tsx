import { createFileRoute, useRouter } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { authClient } from '@/features/auth/auth.client'
import { AppShell } from '@/components/app/app-shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/features/i18n/provider'
import { fmtDateTime } from '@/lib/format-date'
import { getWaitlistFn } from '@/features/admin/middleware'

interface WaitlistSearch {
  page?: number
  pageSize?: number
}

export const Route = createFileRoute('/{-$locale}/admin/waitlist')({
  validateSearch: (s: Record<string, unknown>): WaitlistSearch => {
    const out: WaitlistSearch = {}
    if (typeof s.page === 'number') out.page = s.page
    if (typeof s.pageSize === 'number') out.pageSize = s.pageSize
    return out
  },
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getWaitlistFn({ data: { page: deps.page ?? 0, pageSize: deps.pageSize ?? 20 } }),
  component: WaitlistAdmin,
})

function WaitlistAdmin() {
  const { rows, total } = Route.useLoaderData()
  const search = Route.useSearch()
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const { t } = useTranslation()
  const page = search.page ?? 0
  const pageSize = search.pageSize ?? 20
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  function setSearch(patch: Partial<WaitlistSearch>) {
    void router.navigate({ to: '/{-$locale}/admin/waitlist', search: { ...search, ...patch } })
  }

  return (
    <AppShell
      user={{
        name: session?.user?.name,
        email: session?.user?.email ?? '',
        role: session?.user?.role ?? 'admin',
        image: session?.user?.image ?? null,
      }}
      isPro={false}
      active="admin-waitlist"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t('admin.waitlist')} ({total})</h1>
        <a href="/admin/waitlist.csv" className="text-sm text-primary hover:underline">{t('admin.waitlistExport')}</a>
      </div>
      <Card className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-fg-3">
              <th className="px-4 py-2">{t('admin.email')}</th>
              <th className="px-4 py-2">{t('admin.source')}</th>
              <th className="px-4 py-2">{t('admin.locale')}</th>
              <th className="px-4 py-2">{t('admin.joined')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.email} className="border-t border-border">
                <td className="px-4 py-2">{r.email}</td>
                <td className="px-4 py-2"><span className="font-mono text-xs text-fg-2">{r.source}</span></td>
                <td className="px-4 py-2">{r.locale}</td>
                <td className="px-4 py-2">{fmtDateTime(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-6 text-sm text-fg-3">{t('admin.waitlistEmpty')}</p>}
      </Card>
      <div className="mt-4 flex items-center justify-end gap-2">
        <span className="text-sm text-fg-3">{t('admin.pageOf', { page: page + 1, total: totalPages })}</span>
        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setSearch({ page: page - 1, pageSize })}>
          <ChevronLeft size={15} />
        </Button>
        <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setSearch({ page: page + 1, pageSize })}>
          <ChevronRight size={15} />
        </Button>
      </div>
    </AppShell>
  )
}
