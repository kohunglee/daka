/**
 * 全年日历与每日打卡入口。
 * 日历只展示当前登录用户的打卡日期；已打卡日期从 D1 读取并进入只读详情。
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { getMyCheckinDetailFn, getYearCheckinSummaryFn } from '@/features/checkin/actions'
import { displayBacklinkOption, displayHoursOption, formatBeijingDate, type CheckinRecordView } from '@/features/checkin/checkin.shared'
import { DailyCheckinForm } from './daily-checkin-form'

/** 星期表头：最左列是星期一。 */
const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'] as const

/** 每月网格固定 6 行 × 7 列 = 42 格，保证所有月份等高。 */
const CELLS_PER_MONTH = 42

/** 中文月份名，下标即 0-based 月份。 */
const MONTH_NAMES = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'] as const

/** 单月渲染所需的日期网格。 */
interface MonthGrid {
  name: string
  month: number
  cells: number[]
}

/** 生成某年的 12 个月网格数据，星期从周一开始。 */
function buildYear(year: number): MonthGrid[] {
  return MONTH_NAMES.map((name, month) => {
    const totalDays = new Date(year, month + 1, 0).getDate()
    const offset = (new Date(year, month, 1).getDay() + 6) % 7
    const cells: number[] = [
      ...Array.from({ length: offset }, () => 0),
      ...Array.from({ length: totalDays }, (_, index) => index + 1),
    ]
    while (cells.length < CELLS_PER_MONTH) cells.push(0)
    return { name, month, cells }
  })
}

/** 把年月日拼成和服务端一致的日期键。 */
function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** 已打卡日期统一使用红色下划线，保留日期数字本身的可读性。 */
function CheckinMarker({ day }: { day: number }) {
  return <span className="flex h-5 min-w-5 items-center justify-center border-b-2 border-destructive"><span>{day}</span></span>
}

/** 只读展示当天已经保存的完整打卡内容。 */
function CheckinDetail({ record }: { record: CheckinRecordView }) {
  const publicPath = `/checkin/${encodeURIComponent(record.userId)}/${record.checkinDate}`
  return (
    <Card className="mt-5 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="m-0 font-mono text-sm text-fg-3">已打卡 · 只读记录</p>
          <h3 className="mb-0 mt-1 text-xl font-semibold">{record.checkinDate}</h3>
        </div>
        <a
          href={publicPath}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
        >
          链接 <ExternalLink size={14} />
        </a>
      </div>
      <img src={record.imageUrl} alt={`${record.checkinDate} 的 GSC 截图`} className="mt-5 h-auto w-full rounded-lg border border-border" />
      <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-bg-alt p-3"><dt className="text-xs text-fg-3">出海小时</dt><dd className="m-0 mt-1 text-xl font-semibold">{displayHoursOption(record.hours)}</dd></div>
        <div className="rounded-lg bg-bg-alt p-3"><dt className="text-xs text-fg-3">新增外链</dt><dd className="m-0 mt-1 text-xl font-semibold">{displayBacklinkOption(record.backlinks)}</dd></div>
        <div className="rounded-lg bg-bg-alt p-3"><dt className="text-xs text-fg-3">工作质量</dt><dd className="m-0 mt-1 text-xl font-semibold">{record.quality}/10</dd></div>
      </dl>
      <section className="mt-5">
        <h4 className="m-0 text-sm font-semibold text-fg-2">工作日志</h4>
        <p className="mb-0 mt-2 whitespace-pre-wrap leading-7 text-foreground">{record.log}</p>
      </section>
    </Card>
  )
}

/** 全年日历组件的外部身份输入，未登录时保留日历框架但不显示打卡数据。 */
export function YearCalendar({ userId }: { userId: string | null }) {
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [highlight, setHighlight] = useState(false)
  const [showCheckinForm, setShowCheckinForm] = useState(false)
  const [checkedDates, setCheckedDates] = useState<Set<string>>(() => new Set())
  const [currentStreak, setCurrentStreak] = useState(0)
  const [selectedRecord, setSelectedRecord] = useState<CheckinRecordView | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  // 只有年度打卡摘要成功返回后，按钮才显示具体状态，避免慢网速下先闪出错误文案。
  const [loadedSummaryKey, setLoadedSummaryKey] = useState<string | null>(() => (userId ? null : 'logged-out'))
  const timerRef = useRef<number | null>(null)

  const months = useMemo(() => buildYear(year), [year])
  const currentSummaryKey = userId ? `${userId}:${year}` : 'logged-out'
  const statusReady = !userId || loadedSummaryKey === currentSummaryKey
  const today = new Date()
  const todayKey = formatBeijingDate()
  const todayYear = today.getFullYear()
  const todayMonth = today.getMonth()
  const todayDate = today.getDate()
  const todayChecked = checkedDates.has(todayKey)

  /** 年份或登录身份变化时读取年度日期和当前连续天数。 */
  useEffect(() => {
    let cancelled = false
    const requestKey = userId ? `${userId}:${year}` : 'logged-out'
    setSelectedRecord(null)
    setSelectedDate(null)
    setDetailError(null)
    if (!userId) {
      setLoadedSummaryKey(requestKey)
      setCheckedDates(new Set())
      setCurrentStreak(0)
      return () => { cancelled = true }
    }

    setSummaryLoading(true)
    void getYearCheckinSummaryFn({ data: { year } })
      .then((summary) => {
        if (cancelled) return
        setCheckedDates(new Set(summary.checkedDates))
        setCurrentStreak(summary.currentStreak)
        setLoadedSummaryKey(requestKey)
      })
      .catch(() => {
        if (!cancelled) setDetailError('日历数据读取失败，请刷新页面重试。')
      })
      .finally(() => {
        if (!cancelled) setSummaryLoading(false)
      })

    return () => { cancelled = true }
  }, [userId, year])

  /** 清理日期闪烁定时器，避免组件卸载后继续更新状态。 */
  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    },
    [],
  )

  /** 回到今年并点亮今天的日期，3 秒后结束闪烁。 */
  function goToday() {
    const now = new Date()
    setYear(now.getFullYear())
    setHighlight(true)
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setHighlight(false), 3000)
  }

  /** 打开今天的打卡表单时只定位到今年，不触发日期闪烁。 */
  function openTodayCheckinForm() {
    const now = new Date()
    setYear(now.getFullYear())
    setHighlight(false)
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    setShowCheckinForm(true)
  }

  /** 读取某个已打卡日期的完整记录；未打卡日期保持默认光标且不响应。 */
  async function openCheckinDetail(checkinDate: string) {
    if (!userId || !checkedDates.has(checkinDate)) return
    setSelectedDate(checkinDate)
    setSelectedRecord(null)
    setDetailError(null)
    setDetailLoading(true)
    try {
      const record = await getMyCheckinDetailFn({ data: { date: checkinDate } })
      if (!record) setDetailError('当天记录不存在，可能已被手动删除。')
      else setSelectedRecord(record)
    } catch {
      setDetailError('当天记录读取失败，请稍后重试。')
    } finally {
      setDetailLoading(false)
    }
  }

  /** 未登录时引导登录；已打卡时直接打开今天的只读详情。 */
  function handleTodayAction() {
    if (userId && !statusReady) return
    if (!userId) {
      window.location.href = '/login'
      return
    }
    if (todayChecked) {
      void openCheckinDetail(todayKey)
      return
    }
    openTodayCheckinForm()
  }

  /** 提交成功后立即更新日历和只读详情，避免等待下一次页面刷新。 */
  function handleCheckinSuccess(record: CheckinRecordView, streak: number) {
    setCheckedDates((previous) => new Set(previous).add(record.checkinDate))
    setCurrentStreak(streak)
    setShowCheckinForm(false)
    setSelectedDate(record.checkinDate)
    setSelectedRecord(record)
    setDetailError(null)
  }

  return (
    <section className="mx-auto w-full max-w-[1150px] px-5 py-10">
      {/* 标题行：年份、连续打卡天数和左右切换按钮保持同一行。 */}
      <div className="relative mb-4 flex items-center justify-between gap-3">
        <h2 className="font-mono text-3xl font-semibold tracking-tight">{year}</h2>
        <p className="pointer-events-none absolute left-1/2 top-1/2 m-0 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-center text-sm font-semibold text-fg-2">
          已经打卡 <span className="font-mono text-lg text-destructive">{currentStreak}</span> 天
        </p>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setYear((value) => value - 1)} aria-label="上一年" className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-fg-3 transition-colors hover:bg-bg-alt hover:text-foreground"><ChevronLeft size={17} /></button>
          <button type="button" onClick={goToday} className="flex h-8 items-center justify-center rounded-md border border-border px-3 font-mono text-sm text-fg-3 transition-colors hover:bg-bg-alt hover:text-foreground">今天</button>
          <button type="button" onClick={() => setYear((value) => value + 1)} aria-label="下一年" className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-fg-3 transition-colors hover:bg-bg-alt hover:text-foreground"><ChevronRight size={17} /></button>
        </div>
      </div>

      {summaryLoading && userId && <p className="mb-3 text-center text-xs text-fg-3">正在读取打卡日历……</p>}
      {/* 12 个月：宽度不超过 600px 时 2 列，601–1080px 时 3 列，更宽时 6 列。 */}
      <div className="grid grid-cols-2 gap-3 min-[601px]:grid-cols-3 min-[1081px]:grid-cols-6">
        {months.map((month) => (
          <div key={month.name} className="p-2 font-mono">
            <div className="mb-1.5 text-center text-sm font-semibold text-fg-3">{month.name}</div>
            <div className="grid grid-cols-7 gap-y-0.5">
              {WEEKDAYS.map((weekday) => <div key={weekday} className="text-center text-[11px] leading-none text-fg-3">{weekday}</div>)}
              {month.cells.map((day, index) => {
                if (day === 0) return <div key={`${month.name}-${index}`} className="h-5" />
                const date = dateKey(year, month.month, day)
                const isToday = year === todayYear && month.month === todayMonth && day === todayDate
                const isChecked = checkedDates.has(date)
                return (
                  <button
                    key={`${month.name}-${index}`}
                    type="button"
                    onClick={() => { if (isChecked) void openCheckinDetail(date) }}
                    aria-label={isChecked ? `${date}，已打卡，查看详情` : `${date}，未打卡`}
                    className={`flex h-5 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-xs leading-none ${isChecked ? 'font-semibold text-destructive' : 'text-foreground'} ${isToday ? 'today-cell' : ''} ${isToday && highlight ? 'today-blink' : ''}`}
                  >
                    {isChecked ? <CheckinMarker day={day} /> : day}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 未登录保留日历框架，打卡按钮负责引导登录。已打卡后按钮变为浅红色。 */}
      <button
        type="button"
        onClick={handleTodayAction}
        disabled={Boolean(userId && !statusReady)}
        aria-busy={!statusReady}
        aria-label={statusReady ? (!userId ? '登录后打卡今天' : todayChecked ? '今日已打卡' : '打卡今天') : '正在判断今日打卡状态'}
        aria-expanded={showCheckinForm}
        aria-controls="daily-checkin-form"
        className={`mx-auto mt-8 flex min-h-12 w-full max-w-sm items-center justify-center rounded-lg border px-6 py-3 text-lg font-semibold shadow-lg transition-colors ${!statusReady ? 'border-border bg-bg-alt text-transparent' : todayChecked ? 'border-destructive/30 bg-destructive/15 text-destructive hover:bg-destructive/20' : 'border-transparent bg-primary text-primary-foreground hover:bg-primary/90'}`}
      >
        {statusReady && (!userId ? '登录后打卡今天' : todayChecked ? '今日已打卡' : '打卡今天')}
      </button>
      {showCheckinForm && userId && !todayChecked && (
        <div id="daily-checkin-form">
          <DailyCheckinForm onSuccess={handleCheckinSuccess} />
        </div>
      )}

      {detailLoading && <p className="mt-5 text-center text-sm text-fg-2">正在读取当天记录……</p>}
      {detailError && <p className="mt-5 text-center text-sm text-destructive" role="alert">{detailError}</p>}
      {selectedRecord && selectedDate === selectedRecord.checkinDate && <CheckinDetail record={selectedRecord} />}
    </section>
  )
}
