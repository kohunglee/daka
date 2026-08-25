import { and, asc, eq, gte, lte } from 'drizzle-orm'
import type { DB } from '@/db/client'
import { dailyCheckin } from './checkin.schema'
import {
  calculateCurrentStreak,
  countChineseCharacters,
  isCheckinOption,
  isValidCheckinDate,
  MAX_CHECKIN_IMAGE_BYTES,
  type CheckinRecordView,
} from './checkin.shared'

/** 校验请求中的日期范围，避免日历接口被用来查询异常年份。 */
export function validateYear(year: number): boolean {
  return Number.isInteger(year) && year >= 1970 && year <= 2200
}

/** 把 D1 记录转换成不会暴露内部字段的只读展示对象。 */
export function toCheckinRecordView(row: typeof dailyCheckin.$inferSelect): CheckinRecordView {
  return {
    id: row.id,
    userId: row.userId,
    checkinDate: row.checkinDate,
    hours: row.hours,
    backlinks: row.backlinks,
    quality: row.quality,
    log: row.log,
    imageUrl: `/api/checkins/${encodeURIComponent(row.userId)}/${row.checkinDate}`,
    imageBytes: row.imageBytes,
    createdAt: row.createdAt.toISOString(),
  }
}

/** 查询用户全年已打卡日期和全部历史日期，用于计算当前连续天数。 */
export async function getYearCheckinData(db: DB, userId: string, year: number) {
  const startDate = `${year}-01-01`
  const endDate = `${year}-12-31`
  const [yearRows, allRows] = await Promise.all([
    db
      .select({ checkinDate: dailyCheckin.checkinDate })
      .from(dailyCheckin)
      .where(and(eq(dailyCheckin.userId, userId), gte(dailyCheckin.checkinDate, startDate), lte(dailyCheckin.checkinDate, endDate)))
      .orderBy(asc(dailyCheckin.checkinDate)),
    db
      .select({ checkinDate: dailyCheckin.checkinDate })
      .from(dailyCheckin)
      .where(eq(dailyCheckin.userId, userId))
      .orderBy(asc(dailyCheckin.checkinDate)),
  ])

  return {
    checkedDates: yearRows.map((row) => row.checkinDate),
    currentStreak: calculateCurrentStreak(allRows.map((row) => row.checkinDate)),
  }
}

/** 读取用户自己的某日记录，日历点击详情使用。 */
export async function getUserCheckin(db: DB, userId: string, checkinDate: string) {
  if (!isValidCheckinDate(checkinDate)) return null
  const row = await db
    .select()
    .from(dailyCheckin)
    .where(and(eq(dailyCheckin.userId, userId), eq(dailyCheckin.checkinDate, checkinDate)))
    .limit(1)
  return row[0] ? toCheckinRecordView(row[0]) : null
}

/** 读取公开链接对应的某日记录，不要求登录，也不提供记录列表入口。 */
export async function getPublicCheckin(db: DB, userId: string, checkinDate: string) {
  return getUserCheckin(db, userId, checkinDate)
}

/** 服务端最终校验表单字段，前端校验只能作为体验优化。 */
export function validateCheckinFields(input: {
  hours: string
  backlinks: string
  quality: string
  log: string
  image: File
}): { ok: true } | { ok: false; message: string } {
  if (input.image.type !== 'image/jpeg') return { ok: false, message: '截图必须是 JPEG 图片。' }
  if (input.image.size <= 0 || input.image.size > MAX_CHECKIN_IMAGE_BYTES) {
    return { ok: false, message: '截图压缩后仍超过 300KB，请重新编辑或降低图片内容。' }
  }
  if (!isCheckinOption(input.hours)) return { ok: false, message: '请选择今天的出海时长。' }
  if (!isCheckinOption(input.backlinks)) return { ok: false, message: '请选择今天的外链数量。' }
  if (!/^\d+$/.test(input.quality) || Number(input.quality) < 1 || Number(input.quality) > 10) return { ok: false, message: '工作质量必须是 1～10 的整数。' }
  if (input.log.length > 2000) return { ok: false, message: '工作日志最多 2000 个字符。' }
  if (countChineseCharacters(input.log) < 20) return { ok: false, message: '工作日志至少需要 20 个汉字。' }
  return { ok: true }
}

/** 生成写入 D1 的枚举和评分字段，调用方已经完成范围校验。 */
export function parseCheckinOptions(input: { hours: string; backlinks: string; quality: string }) {
  return {
    hours: input.hours,
    backlinks: input.backlinks,
    quality: Number(input.quality),
  }
}
