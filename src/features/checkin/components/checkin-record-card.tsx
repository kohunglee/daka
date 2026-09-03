import { useState, type SyntheticEvent } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { displayBacklinkOption, displayHoursOption, type CheckinRecordView } from '../checkin.shared'
import { useTranslation } from '@/features/i18n/provider'

/** 可复用的单条打卡记录卡片；“我的记录”和广场个人主页共用同一套展示结构。 */
export function CheckinRecordCard({ record, name, userImage }: { record: CheckinRecordView; name: string; userImage?: string | null }) {
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

/** 竖图折叠成 1:1 视觉窗口，并用渐隐避免底部出现生硬裁切。 */
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
