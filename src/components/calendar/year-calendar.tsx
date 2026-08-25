/**
 * 2026 年全年日历（打卡系统 MVP 占位）
 *
 * 布局：上排 6 个月、下排 6 个月；每周最左列是星期一。
 * 当前只画日期数字，不承载打卡事件——后续接打卡数据时再扩展每个格子。
 * 说明：月份/星期名暂硬编码中文，MVP 阶段不接 i18n，避免过早抽象。
 */
import { useMemo } from 'react'

/** 星期表头：最左列是星期一 */
const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'] as const

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
    return { name, cells }
  })
}

/** 2026 全年日历卡片墙。宽度上限 950，水平居中，主体高度约 350。 */
export function YearCalendar({ year = 2026 }: { year?: number }) {
  const months = useMemo(() => buildYear(year), [year])

  return (
    <section className="mx-auto w-full max-w-[950px] px-5 py-10">
      {/* 标题行：年份 + 占位标注 */}
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-display text-2xl font-semibold tracking-tight">{year}</h2>
        <span className="kicker">// 打卡系统 · MVP 占位</span>
      </div>

      {/* 12 个月：桌面两行各 6 个，小屏四行各 3 个 */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {months.map((m) => (
          <div key={m.name} className="rounded-lg border border-border bg-card p-2">
            <div className="mb-1 text-center text-[11px] font-semibold text-fg-2">{m.name}</div>
            {/* 表头 + 日期共用同一个 7 列网格，天然对齐 */}
            <div className="grid grid-cols-7 gap-y-0.5">
              {WEEKDAYS.map((w, i) => (
                <div
                  key={w}
                  className={`text-center text-[9px] leading-none ${i >= 5 ? 'text-fg-3' : 'text-fg-2'}`}
                >
                  {w}
                </div>
              ))}
              {m.cells.map((day, i) =>
                day === 0 ? (
                  // 空白占位：保持网格对齐，无内容
                  <div key={`${m.name}-${i}`} />
                ) : (
                  <div
                    key={`${m.name}-${i}`}
                    className="flex h-4 items-center justify-center font-mono text-[10px] leading-none tabular-nums text-foreground"
                  >
                    {day}
                  </div>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
