/**
 * 打卡模块共享规则。
 * 这些常量和纯函数同时服务浏览器端与 Worker 端，避免前后端校验口径漂移。
 */

/** 处理后的 GSC 截图最大体积：300 KiB。 */
export const MAX_CHECKIN_IMAGE_BYTES = 300 * 1024

/** 前端编辑画布允许的最长边，超出时先按比例缩小。 */
export const MAX_CHECKIN_IMAGE_DIMENSION = 2560

/** 允许服务端保存的最终图片格式。 */
export const CHECKIN_IMAGE_CONTENT_TYPE = 'image/jpeg'

/** 小时和外链的数据库枚举值；页面只展示对应中文选项，不展示字母。 */
export const CHECKIN_OPTION_KEYS = ['A', 'B', 'C', 'D'] as const
export type CheckinOption = (typeof CHECKIN_OPTION_KEYS)[number]
export const HOURS_OPTION_LABELS: Record<CheckinOption, string> = {
  A: '1',
  B: '2~5',
  C: '5~8',
  D: '8~12',
}
export const BACKLINK_OPTION_LABELS: Record<CheckinOption, string> = {
  A: '0',
  B: '1',
  C: '2~4',
  D: '5+',
}

/** 将数据库里的枚举值转换成页面展示文字；未知值原样返回便于排查数据。 */
export function displayHoursOption(value: string): string {
  return HOURS_OPTION_LABELS[value as CheckinOption] ?? value
}

/** 将数据库里的枚举值转换成页面展示文字；未知值原样返回便于排查数据。 */
export function displayBacklinkOption(value: string): string {
  return BACKLINK_OPTION_LABELS[value as CheckinOption] ?? value
}

/** 校验小时/外链是否为四档枚举值。 */
export function isCheckinOption(value: string): value is CheckinOption {
  return (CHECKIN_OPTION_KEYS as readonly string[]).includes(value)
}

/** 首页年度日历接口返回的摘要。 */
export interface CheckinCalendarSummary {
  authenticated: boolean
  year: number
  checkedDates: string[]
  currentStreak: number
}

/** 只读展示所需的完整打卡记录。 */
export interface CheckinRecordView {
  id: string
  userId: string
  checkinDate: string
  hours: string
  backlinks: string
  quality: number
  log: string
  imageUrl: string
  imageBytes: number
  createdAt: string
}

/** 提交打卡接口的结果，前端据此区分成功、重复提交和可重试错误。 */
export type SubmitCheckinResult =
  | { status: 'created'; record: CheckinRecordView; currentStreak: number }
  | { status: 'already_checked_in'; record: CheckinRecordView; currentStreak: number }
  | { status: 'validation_error'; message: string }
  | { status: 'save_error'; message: string }

/** 只计算汉字数量，标点、数字、英文和空白不计入日志最低字数。 */
export function countChineseCharacters(text: string): number {
  const chineseCharacter = /\p{Script=Han}/u
  return Array.from(text).filter((character) => chineseCharacter.test(character)).length
}

/** 校验 YYYY-MM-DD，并拒绝不存在的日期。 */
export function isValidCheckinDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [yearText, monthText, dayText] = value.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

/** 把北京时间的当前日期格式化为稳定的 YYYY-MM-DD，不依赖浏览器时区。 */
export function formatBeijingDate(timestamp = Date.now()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(timestamp))
  const value = (type: 'year' | 'month' | 'day') => parts.find((part) => part.type === type)?.value ?? ''
  return `${value('year')}-${value('month')}-${value('day')}`
}

/** 日期字符串按 UTC 日历运算，避免在本地时区跨日。 */
export function shiftDate(dateText: string, days: number): string {
  const date = new Date(`${dateText}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/** 从全部历史日期计算当前连续打卡天数；今天未打卡时从昨天开始回溯。 */
export function calculateCurrentStreak(checkedDates: string[], today = formatBeijingDate()): number {
  const dateSet = new Set(checkedDates)
  let cursor = dateSet.has(today) ? today : shiftDate(today, -1)
  let streak = 0

  while (dateSet.has(cursor)) {
    streak += 1
    cursor = shiftDate(cursor, -1)
  }

  return streak
}

/** 服务端和客户端共用的整数范围校验。 */
export function isPositiveInteger(value: string, maximum?: number): boolean {
  if (!/^\d+$/.test(value)) return false
  const number = Number(value)
  return Number.isSafeInteger(number) && number > 0 && (maximum === undefined || number <= maximum)
}
