import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { BookOpen, ChevronLeft, ChevronRight, Download, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/app/app-shell'
import { ImageLightbox } from '@/components/media/image-lightbox'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { requireUser } from '@/features/auth/middleware'
import { getMyCheckinsFn, getMyCheckinsForExportFn } from '@/features/checkin/actions'
import { CheckinRecordCard } from '@/features/checkin/components/checkin-record-card'
import type { CheckinRecordView } from '@/features/checkin/checkin.shared'
import { getEntitlement } from '@/features/billing/middleware'
import { useTranslation } from '@/features/i18n/provider'
import { getMyUserSettingsFn, setMyShowInPlazaFn } from '@/features/settings/user-settings.actions'

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
    const [user, ent, records, settings] = await Promise.all([
      requireUser({ data: { locale: (params as { locale?: string }).locale } }),
      getEntitlement(),
      getMyCheckinsFn({ data: { page: deps.page ?? 0 } }),
      getMyUserSettingsFn(),
    ])
    return { user, ent, records, settings }
  },
  head: () => ({ meta: [{ title: '我的记录' }, { name: 'robots', content: 'noindex' }] }),
  component: MyRecordsPage,
})

/** 当前登录用户的朋友圈式竖版打卡信息流。 */
function MyRecordsPage() {
  const { user, ent, records, settings } = Route.useLoaderData()
  const router = useRouter()
  const { t } = useTranslation()
  const page = records.page
  const totalPages = records.totalPages
  const primaryName = user.name || user.email
  const [exporting, setExporting] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [showInPlaza, setShowInPlaza] = useState(settings.showInPlaza)
  const [plazaSettingBusy, setPlazaSettingBusy] = useState(false)
  const [plazaSettingMessage, setPlazaSettingMessage] = useState<string | null>(null)

  /** 翻页时保留 URL 状态，让服务端重新读取对应的 20 条记录。 */
  function setPage(nextPage: number) {
    void router.navigate({ to: '/{-$locale}/app/records', search: { page: nextPage } })
  }

  /** 保存是否出现在广场；失败时恢复开关状态，不影响已有打卡记录。 */
  async function handleShowInPlaza(enabled: boolean) {
    const previous = showInPlaza
    setShowInPlaza(enabled)
    setPlazaSettingBusy(true)
    setPlazaSettingMessage(null)
    try {
      const nextSettings = await setMyShowInPlazaFn({ data: { enabled } })
      setShowInPlaza(nextSettings.showInPlaza)
      setPlazaSettingMessage(nextSettings.showInPlaza ? '已允许在广场展示。' : '已隐藏广场展示。')
    } catch {
      setShowInPlaza(previous)
      setPlazaSettingMessage('设置保存失败，请稍后重试。')
    } finally {
      setPlazaSettingBusy(false)
    }
  }

  /** 下载当前账号的全部打卡记录；CSV 使用 UTF-8 BOM，便于表格软件正确识别中文。 */
  async function exportRecords() {
    setExporting(true)
    try {
      const exportedAt = new Date()
      const rows = await getMyCheckinsForExportFn()
      const file = new Blob([createCheckinCsv(rows)], { type: 'text/csv;charset=utf-8' })
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
        </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => { void exportRecords() }} disabled={exporting}>
            <Download size={15} />{exporting ? t('app.exportRecordsBusy') : t('app.exportRecords')}
          </Button>
        </div>
        <div className="mt-4 flex items-center gap-3 text-sm text-fg-2">
          <span>{t('app.myRecordsTotal', { count: String(records.total) })}</span>
        </div>
        <label className="mt-4 flex max-w-[760px] cursor-pointer items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3 text-sm">
          <span>
            <span className="block font-semibold text-foreground">是否显示在广场</span>
            <span className="mt-1 block text-xs text-fg-3">允许后，广场会展示头像、昵称和打卡记录。</span>
            {plazaSettingMessage && <span className="mt-1 block text-xs text-fg-2" role="status">{plazaSettingMessage}</span>}
          </span>
          <input
            type="checkbox"
            checked={showInPlaza}
            disabled={plazaSettingBusy}
            onChange={(event) => { void handleShowInPlaza(event.target.checked) }}
            className="h-4 w-4 shrink-0 accent-primary"
          />
        </label>
      </div>

      {records.rows.length === 0 ? (
        <Card className="max-w-[760px] p-8 text-center">
          <ImageIcon className="mx-auto text-fg-3" size={28} />
          <p className="mb-0 mt-3 text-sm text-fg-2">{t('app.myRecordsEmpty')}</p>
        </Card>
      ) : (
        <div className="grid max-w-[760px] gap-5">
          {records.rows.map((record, index) => (
            <CheckinRecordCard
              key={record.id}
              record={record}
              name={primaryName}
              userImage={user.image}
              onImageClick={() => setLightboxIndex(index)}
            />
          ))}
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

      {/* 当前页的记录组成一个图片画廊；卡片内原有正方形遮罩保持不变，灯箱负责查看完整原图。 */}
      <ImageLightbox
        openIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        slides={records.rows.map((record) => ({
          src: record.imageUrl,
          alt: `${record.checkinDate} 的打卡截图`,
          title: record.checkinDate,
        }))}
      />
    </AppShell>
  )
}

/** 把 CSV 单元格安全转义，避免日志中的逗号、引号或换行破坏列结构。 */
function escapeCsvCell(value: string | number): string {
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** 生成适合 Excel 和其他表格软件打开的打卡记录 CSV。 */
function createCheckinCsv(rows: CheckinRecordView[]): string {
  const header = ['记录 ID', '日期', '出海时间', '新增外链', '工作质量', '工作日志', '图片地址', '图片大小（字节）', '创建时间']
  const lines = rows.map((record) => [
    record.id,
    record.checkinDate,
    record.hours,
    record.backlinks,
    record.quality,
    record.log,
    record.imageUrl,
    record.imageBytes,
    record.createdAt,
  ].map(escapeCsvCell).join(','))
  return `\uFEFF${[header.join(','), ...lines].join('\r\n')}\r\n`
}

/** 生成不覆盖旧备份的 CSV 文件名，例如 daka-records-20260901-143045-a4k7m2.csv。 */
function createExportFileName(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  const timestamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789'
  const randomBytes = crypto.getRandomValues(new Uint8Array(6))
  const suffix = Array.from(randomBytes, (value) => alphabet.charAt(value % alphabet.length)).join('')
  return `daka-records-${timestamp}-${suffix}.csv`
}
