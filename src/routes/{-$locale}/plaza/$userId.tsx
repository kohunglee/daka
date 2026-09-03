import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { ArrowLeft, ChevronLeft, ChevronRight, Users } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckinRecordCard } from '@/features/checkin/components/checkin-record-card'
import { getPublicPlazaUserFn } from '@/features/checkin/actions'

interface PlazaUserSearch {
  page?: number
}

export const Route = createFileRoute('/{-$locale}/plaza/$userId')({
  validateSearch: (search: Record<string, unknown>): PlazaUserSearch => ({
    page: typeof search.page === 'number' && Number.isInteger(search.page) && search.page >= 0 ? search.page : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ params, deps }) => getPublicPlazaUserFn({ data: { userId: params.userId, page: deps.page ?? 0 } }),
  head: () => ({ meta: [{ name: 'robots', content: 'noindex' }] }),
  component: PlazaUserPage,
})

/** 广场用户个人小主页：顶部是摘要，下方复用“我的记录”的单条信息流卡片。 */
function PlazaUserPage() {
  const result = Route.useLoaderData()
  const router = useRouter()

  if (!result) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-5 text-center">
        <Users className="text-fg-3" size={30} />
        <p className="mb-4 mt-3 text-sm text-fg-2">该用户暂未公开展示，或用户不存在。</p>
        <Link to="/{-$locale}/plaza" className="text-sm text-primary hover:underline">返回广场</Link>
      </main>
    )
  }

  const { profile, rows, page, totalPages } = result
  const name = profile.name

  function setPage(nextPage: number) {
    void router.navigate({ to: '/{-$locale}/plaza/$userId', params: { userId: profile.userId }, search: { page: nextPage } })
  }

  return (
    <main className="mx-auto w-full max-w-[1450px] px-4 py-12 md:px-7 md:py-14">
      <Link to="/{-$locale}/plaza" className="mb-8 inline-flex items-center gap-1.5 text-sm text-fg-2 hover:text-foreground">
        <ArrowLeft size={15} />返回广场
      </Link>

      <header className="mb-8 flex items-center gap-4">
        <Avatar className="size-16">
          <AvatarImage src={profile.image ?? undefined} alt={name} />
          <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="page-h">{name}</h1>
          <p className="mb-0 mt-1.5 text-sm text-fg-2">已坚持 {profile.checkinCount} 天 · 当前连续 {profile.currentStreak} 天</p>
        </div>
      </header>

      {rows.length === 0 ? (
        <Card className="p-8 text-center text-sm text-fg-2">暂时还没有打卡记录。</Card>
      ) : (
        <div className="grid max-w-[760px] gap-5">
          {rows.map((record) => <CheckinRecordCard key={record.id} record={record} name={name} userImage={profile.image} />)}
        </div>
      )}

      <div className="mt-6 flex max-w-[760px] items-center justify-between border-t border-border pt-4">
        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
          <ChevronLeft size={15} />上一页
        </Button>
        <span className="font-mono text-xs text-fg-3">第 {page + 1} / {totalPages} 页</span>
        <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)}>
          下一页<ChevronRight size={15} />
        </Button>
      </div>
    </main>
  )
}
