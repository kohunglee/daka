import { createFileRoute } from '@tanstack/react-router'
import { Card } from '@/components/ui/card'
import { getPublicCheckinDetailFn } from '@/features/checkin/actions'

/** 公开链接只展示单条记录，不提供用户记录列表或编辑入口。 */
export const Route = createFileRoute('/{-$locale}/checkin/$userId/$date')({
  loader: ({ params }) => getPublicCheckinDetailFn({ data: { userId: params.userId, date: params.date } }),
  head: () => ({ meta: [{ name: 'robots', content: 'noindex' }] }),
  component: PublicCheckinPage,
})

function PublicCheckinPage() {
  const record = Route.useLoaderData()

  if (!record) {
    return <main className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-5"><p className="text-fg-2">这条打卡记录不存在。</p></main>
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-10">
      <Card className="p-5 sm:p-7">
        <p className="m-0 font-mono text-sm text-fg-3">公开打卡记录</p>
        <h1 className="mb-6 mt-2 text-2xl font-semibold">{record.checkinDate}</h1>
        <img src={record.imageUrl} alt={`${record.checkinDate} 的 GSC 截图`} className="h-auto w-full rounded-lg border border-border" />
        <dl className="mt-6 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg bg-bg-alt p-3"><dt className="text-xs text-fg-3">出海小时</dt><dd className="m-0 mt-1 text-xl font-semibold">{record.hours}</dd></div>
          <div className="rounded-lg bg-bg-alt p-3"><dt className="text-xs text-fg-3">新增外链</dt><dd className="m-0 mt-1 text-xl font-semibold">{record.backlinks}</dd></div>
          <div className="rounded-lg bg-bg-alt p-3"><dt className="text-xs text-fg-3">工作质量</dt><dd className="m-0 mt-1 text-xl font-semibold">{record.quality}/10</dd></div>
        </dl>
        <section className="mt-6">
          <h2 className="m-0 text-sm font-semibold text-fg-2">今日工作日志</h2>
          <p className="mb-0 mt-2 whitespace-pre-wrap leading-7 text-foreground">{record.log}</p>
        </section>
      </Card>
    </main>
  )
}
