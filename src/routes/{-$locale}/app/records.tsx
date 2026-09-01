import { useState, type SyntheticEvent } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { BookOpen, ChevronLeft, ChevronRight, Download, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/app/app-shell'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { requireUser } from '@/features/auth/middleware'
import { getMyCheckinsFn, getMyCheckinsForExportFn } from '@/features/checkin/actions'
import { displayBacklinkOption, displayHoursOption, type CheckinRecordView } from '@/features/checkin/checkin.shared'
import { getEntitlement } from '@/features/billing/middleware'
import { useTranslation } from '@/features/i18n/provider'

interface RecordsSearch {
  page?: number
}

export const Route = createFileRoute('/{-$locale}/app/records')({
  /** 页码放入 URL，刷新或复制链接后仍然停留在当前页。 */
  validateSearch: (search: Record<string, unknown>): RecordsSearch => ({
    page: typeof search.page === 'number' && Number.isInteger(search.page) && search.page >= 0 ? search.page : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ params, deps }) => {
    const [user, ent, records] = await Promise.all([
      requireUser({ data: { locale: (params as { locale?: string }).locale } }),
      getEntitlement(),
      getMyCheckinsFn({ data: { page: deps.page ?? 0 } }),
    ])
    return { user, ent, records }
  },
  head: () => ({ meta: [{ title: '我的记录' }, { name: 'robots', content: 'noindex' }] }),
  component: MyRecordsPage,
})

/** 当前登录用户的朋友圈式竖版打卡信息流。 */
function MyRecordsPage() {
  const { user, ent, records } = Route.useLoaderData()
  const router = useRouter()
  const { t } = useTranslation()
  const page = records.page
  const totalPages = records.totalPages
  const primaryName = user.name || user.email
  const [exporting, setExporting] = useState(false)

  /** 翻页时保留 URL 状态，让服务端重新读取对应的 20 条记录。 */
  function setPage(nextPage: number) {
    void router.navigate({ to: '/{-$locale}/app/records', search: { page: nextPage } })
  }

  /**
   * 下载当前账号的全部打卡记录。
   * 文件名使用本地导出时间与加密随机后缀，便于用户区分多次备份文件。
   */
  async function exportRecords() {
    setExporting(true)
    try {
      const exportedAt = new Date()
      const rows = await getMyCheckinsForExportFn()
      const payload = {
        format: 'daka.run/checkins',
        version: 1,
        exportedAt: exportedAt.toISOString(),
        total: rows.length,
        records: rows.map((record) => ({
          id: record.id,
          date: record.checkinDate,
          hours: record.hours,
          backlinks: record.backlinks,
          quality: record.quality,
          log: record.log,
          imageUrl: record.imageUrl,
          imageBytes: record.imageBytes,
          createdAt: record.createdAt,
        })),
      }
      const file = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
      const objectUrl = URL.createObjectURL(file)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = createExportFileName(exportedAt)
      document.body.append(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
      toast.success(t('app.exportRecordsSuccess', { count: String(rows.length) }))
    } catch {
      toast.error(t('app.exportRecordsFailed'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <AppShell user={user} isPro={ent.plan === 'pro'} active="records" paymentFailed={ent.paymentFailed}>
      <div className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
          <span className="rounded-lg bg-soft p-2 text-primary"><BookOpen size={22} /></span>
          <div>
            <h1 className="page-h">{t('app.myRecords')}</h1>
            <p className="mt-1.5 text-[14.5px] text-fg-2">{t('app.myRecordsSub')}</p>
          </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => { void exportRecords() }} disabled={exporting}>
            <Download size={15} />{exporting ? t('app.exportRecordsBusy') : t('app.exportRecords')}
          </Button>
        </div>
        <div className="mt-4 flex items-center gap-3 text-sm text-fg-2">
          <span>{t('app.myRecordsTotal', { count: String(records.total) })}</span>
        </div>
      </div>

      {records.rows.length === 0 ? (
        <Card className="max-w-[760px] p-8 text-center">
          <ImageIcon className="mx-auto text-fg-3" size={28} />
          <p className="mb-0 mt-3 text-sm text-fg-2">{t('app.myRecordsEmpty')}</p>
        </Card>
      ) : (
        <div className="grid max-w-[760px] gap-5">
          {records.rows.map((record) => <RecordCard key={record.id} record={record} name={primaryName} userImage={user.image} />)}
        </div>
      )}

      <div className="mt-6 flex max-w-[760px] items-center justify-between border-t border-border pt-4">
        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
          <ChevronLeft size={15} />{t('app.recordsPrevious')}
        </Button>
        <span className="font-mono text-xs text-fg-3">{t('app.recordsPageOf', { page: String(page + 1), total: String(totalPages) })}</span>
        <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)}>
          {t('app.recordsNext')}<ChevronRight size={15} />
        </Button>
      </div>
    </AppShell>
  )
}

/** 生成不覆盖旧备份的 JSON 文件名，例如 daka-records-20260901-143045-a4k7m2.json。 */
function createExportFileName(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  const timestamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789'
  const randomBytes = crypto.getRandomValues(new Uint8Array(6))
  const suffix = Array.from(randomBytes, (value) => alphabet.charAt(value % alphabet.length)).join('')
  return `daka-records-${timestamp}-${suffix}.json`
}

/** 单条记录卡片：图片保持 450px 固定宽度，窄屏通过横向滚动保持原尺寸。 */
function RecordCard({ record, name, userImage }: { record: CheckinRecordView; name: string; userImage?: string | null }) {
  const { t } = useTranslation()
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-start justify-between gap-4 p-5 pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar>
            <AvatarImage src={userImage ?? undefined} alt={name} />
            <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="truncate text-sm font-semibold">{name}</div>
        </div>
        <time className="shrink-0 rounded-md bg-white px-2.5 py-1 font-mono text-sm font-bold tracking-wide text-black" dateTime={record.checkinDate}>
          {record.checkinDate}
        </time>
      </div>

      <div className="overflow-x-auto px-5 pb-5">
        <RecordImage record={record} title={t('app.openImage')} />
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-border px-5 py-4 text-center">
        <div><div className="text-xs text-fg-3">{t('app.myRecordsHours')}</div><div className="mt-1 font-semibold">{displayHoursOption(record.hours)}</div></div>
        <div><div className="text-xs text-fg-3">{t('app.myRecordsBacklinks')}</div><div className="mt-1 font-semibold">{displayBacklinkOption(record.backlinks)}</div></div>
        <div><div className="text-xs text-fg-3">{t('app.myRecordsQuality')}</div><div className="mt-1 font-semibold">{record.quality}/10</div></div>
      </div>

      <section className="border-t border-border px-5 py-4">
        <h2 className="m-0 text-sm font-semibold text-fg-2">{t('app.myRecordsLog')}</h2>
        <p className="mb-0 mt-2 whitespace-pre-wrap leading-7 text-foreground">{record.log}</p>
      </section>
    </Card>
  )
}

/** 竖图折叠成 1:1 视觉窗口，并用 45px 渐隐避免底部出现生硬裁切。 */
function RecordImage({ record, title }: { record: CheckinRecordView; title: string }) {
  const [isPortrait, setIsPortrait] = useState(false)

  /** 图片加载后按真实尺寸判断方向，横图保持原始宽高比例。 */
  function handleImageLoad(event: SyntheticEvent<HTMLImageElement>) {
    setIsPortrait(event.currentTarget.naturalHeight > event.currentTarget.naturalWidth)
  }

  return (
    <a href={record.imageUrl} target="_blank" rel="noopener noreferrer" title={title} className="block w-[450px] transition-opacity hover:opacity-85">
      <div className={isPortrait ? 'relative h-[450px] w-[450px] overflow-hidden rounded-lg border border-border bg-background' : 'w-[450px]'}>
        <img
          src={record.imageUrl}
          alt={`${record.checkinDate} 的打卡截图`}
          onLoad={handleImageLoad}
          className={isPortrait ? 'block h-[450px] w-[450px] object-cover object-top transition-[opacity] duration-300' : 'block h-auto w-[450px] rounded-lg border border-border'}
          loading="lazy"
        />
        {isPortrait && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[45px] bg-gradient-to-t from-background via-background/80 to-transparent" aria-hidden="true" />}
      </div>
    </a>
  )
}
