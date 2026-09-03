import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, Users } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { getPlazaUsersFn } from '@/features/checkin/actions'

export const Route = createFileRoute('/{-$locale}/plaza/')({
  loader: () => getPlazaUsersFn(),
  component: PlazaIndexPage,
})

/** 广场首页只展示用户摘要；具体打卡内容留给用户个人小主页。 */
function PlazaIndexPage() {
  const users = Route.useLoaderData()

  return (
    <main className="mx-auto w-full max-w-[1450px] px-4 py-14 md:px-7 md:py-16">
      <header className="mb-10">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-soft p-2 text-primary"><Users size={22} /></span>
          <div>
            <h1 className="page-h">广场</h1>
            <p className="mt-1.5 text-[14.5px] text-fg-2">看看正在坚持 Web 出海的朋友。</p>
          </div>
        </div>
      </header>

      {users.length === 0 ? (
        <Card className="p-10 text-center">
          <Users className="mx-auto text-fg-3" size={30} />
          <p className="mb-0 mt-3 text-sm text-fg-2">广场还没有公开展示的打卡用户。</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {users.map((plazaUser) => (
            <Link
              key={plazaUser.userId}
              to="/{-$locale}/plaza/$userId"
              params={{ userId: plazaUser.userId }}
              className="group block"
            >
              <Card className="flex items-center gap-4 p-5 transition-colors group-hover:border-border-strong">
                <Avatar className="size-12">
                  <AvatarImage src={plazaUser.image ?? undefined} alt={plazaUser.name} />
                  <AvatarFallback>{plazaUser.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-foreground">{plazaUser.name}</div>
                  <div className="mt-1 text-sm text-fg-2">已坚持 {plazaUser.checkinCount} 天</div>
                  <div className="mt-0.5 text-xs text-fg-3">当前连续 {plazaUser.currentStreak} 天</div>
                </div>
                <ArrowRight size={17} className="shrink-0 text-fg-3 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
