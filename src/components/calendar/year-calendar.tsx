/**
 * 2026 年全年日历（打卡系统 MVP 占位）
 *
 * 布局：上排 6 个月、下排 6 个月；每周最左列是星期一。
 * 日历只负责日期展示和今天定位，打卡表单由同目录的独立组件承载。
 * 右上角提供年份左右切换按钮。
 * 说明：月份/星期名暂硬编码中文，MVP 阶段不接 i18n，避免过早抽象。
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DailyCheckinForm } from './daily-checkin-form'

/** 星期表头：最左列是星期一 */
const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'] as const

/** 每月网格固定 6 行 × 7 列 = 42 格，保证所有月份等高、切换年份时布局不抖动 */
const CELLS_PER_MONTH = 42

/** 中文月份名，下标即 0-based 月份 */
const MONTH_NAMES = [
  '一月',
  '二月',
  '三月',
  '四月',
  '五月',
  '六月',
  '七月',
  '八月',
  '九月',
  '十月',
  '十一月',
  '十二月',
] as const

/** 单月渲染所需的最小数据 */
interface MonthGrid {
  name: string
  /** 铺平后的日期格：0 = 前置空白占位，其余为当月日期数字 */
  cells: number[]
}

/**
 * 生成某年 12 个月的网格数据。
 * 用 0 填充「1 号之前」的空位，让每个日期都能落在正确的星期列上。
 */
function buildYear(year: number): MonthGrid[] {
  return MONTH_NAMES.map((name, month) => {
    // 当月天数：下个月 0 号即本月最后一天
    const totalDays = new Date(year, month + 1, 0).getDate()
    // Date#getDay() 周日=0，转成「周一=0」的列偏移
    const offset = (new Date(year, month, 1).getDay() + 6) % 7
    const cells: number[] = [
      ...Array.from({ length: offset }, () => 0),
      ...Array.from({ length: totalDays }, (_, i) => i + 1),
    ]
    // 尾部补 0 到固定 42 格，让每月始终占满 6 行，等高不抖
    while (cells.length < CELLS_PER_MONTH) cells.push(0)
    return { name, cells }
  })
}

/**
 * 全年日历卡片墙。
 * 桌面端上限 1150px，配合更大的字号和日期格高度，让全年日期在大屏上更易读取。
 */
export function YearCalendar() {
  const [year, setYear] = useState(2026)
  // 「今天」高亮：点击后短暂点亮今天的日期，3 秒后自动淡出
  const [highlight, setHighlight] = useState(false)
  // 打卡表单：首次点击底部「打卡今天」后展开，避免首页初始状态过于拥挤
  const [showCheckinForm, setShowCheckinForm] = useState(false)
  const timerRef = useRef<number | null>(null)
  const months = useMemo(() => buildYear(year), [year])

  // 今天（渲染期读取，仅用于定位高亮格）
  const now = new Date()
  const todayYear = now.getFullYear()
  const todayMonth = now.getMonth()
  const todayDate = now.getDate()

  // 卸载时清理定时器，避免对已卸载组件 setState
  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    },
    [],
  )

  /** 回到今年并点亮今天的日期，3 秒后淡出 */
  function goToday() {
    const t = new Date()
    setYear(t.getFullYear())
    setHighlight(true)
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setHighlight(false), 3000)
  }

  /** 展开打卡表单，同时回到今年并触发今天日期的红色闪烁提示。 */
  function openCheckinForm() {
    goToday()
    setShowCheckinForm(true)
  }

  return (
    <section className="mx-auto w-full max-w-[1150px] px-5 py-10">
      {/* 标题行：左侧年份，右侧年份切换按钮 */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-mono text-3xl font-semibold tracking-tight">{year}</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setYear((y) => y - 1)}
            aria-label="上一年"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-fg-3 transition-colors hover:bg-bg-alt hover:text-foreground"
          >
            <ChevronLeft size={17} />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="flex h-8 items-center justify-center rounded-md border border-border px-3 font-mono text-sm text-fg-3 transition-colors hover:bg-bg-alt hover:text-foreground"
          >
            今天
          </button>
          <button
            type="button"
            onClick={() => setYear((y) => y + 1)}
            aria-label="下一年"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-fg-3 transition-colors hover:bg-bg-alt hover:text-foreground"
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>

      {/* 12 个月：桌面两行各 6 个，小屏四行各 3 个；方角卡片 + 全体等宽字体 */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {months.map((m, monthIdx) => (
          <div key={m.name} className="p-2 font-mono">
            <div className="mb-1.5 text-center text-sm font-semibold text-fg-3">{m.name}</div>
            {/* 表头 + 日期共用同一个 7 列网格，天然对齐 */}
            <div className="grid grid-cols-7 gap-y-0.5">
              {WEEKDAYS.map((w) => (
                <div key={w} className="text-center text-[11px] leading-none text-fg-3">
                  {w}
                </div>
              ))}
              {m.cells.map((day, i) => {
                if (day === 0) {
                  // 空白占位：与日期格同高，保证每月固定 6 行等高
                  return <div key={`${m.name}-${i}`} className="h-5" />
                }
                // 今天始终保持高亮；点击「今天」时额外触发短暂闪烁
                const isToday = year === todayYear && monthIdx === todayMonth && day === todayDate
                return (
                  <div
                    key={`${m.name}-${i}`}
                    className={`flex h-5 items-center justify-center text-xs leading-none text-foreground ${
                      isToday ? 'today-cell' : ''
                    } ${
                      isToday && highlight ? 'today-blink' : ''
                    }`}
                  >
                    {day}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 日历下方的主操作：回到今年并触发今天日期的闪烁提示 */}
      <button
        type="button"
        onClick={openCheckinForm}
        aria-expanded={showCheckinForm}
        aria-controls="daily-checkin-form"
        className="mx-auto mt-8 flex min-h-12 w-full max-w-sm items-center justify-center rounded-lg bg-primary px-6 py-3 text-lg font-semibold text-primary-foreground shadow-lg transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        打卡今天
      </button>
      {showCheckinForm && (
        <div id="daily-checkin-form">
          <DailyCheckinForm />
        </div>
      )}
    </section>
  )
}
