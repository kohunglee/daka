import { and, asc, count, desc, eq, gte, lte } from 'drizzle-orm'
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

/** 我的记录固定每页 20 条，服务端与页面分页保持同一个常量。 */
export const MY_CHECKIN_PAGE_SIZE = 20

/** 当前登录用户的历史打卡分页结果。 */
export interface MyCheckinPage {
  rows: CheckinRecordView[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

/** 只按当前用户 ID 查询历史打卡，避免把别人的记录带入个人信息流。 */
export async function listMyCheckins(db: DB, userId: string, page: number): Promise<MyCheckinPage> {
  const safePage = Number.isInteger(page) && page >= 0 ? Math.min(page, 100_000) : 0
  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(dailyCheckin)
      .where(eq(dailyCheckin.userId, userId))
      .orderBy(desc(dailyCheckin.checkinDate), desc(dailyCheckin.createdAt))
      .limit(MY_CHECKIN_PAGE_SIZE)
      .offset(safePage * MY_CHECKIN_PAGE_SIZE),
    db
      .select({ total: count() })
      .from(dailyCheckin)
      .where(eq(dailyCheckin.userId, userId)),
  ])
  const total = totalRows[0]?.total ?? 0
  return {
    rows: rows.map(toCheckinRecordView),
    page: safePage,
    pageSize: MY_CHECKIN_PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / MY_CHECKIN_PAGE_SIZE)),
  }
}

/**
 * 导出当前用户的全部历史打卡记录。
 *
 * 导出量远小于常规列表的分页上限；图片仍保留为受现有接口控制的访问地址，
 * 不把 R2 二进制编码进 JSON，避免用户下载一个难以保存和打开的超大文件。
 */
export async function listMyCheckinsForExport(db: DB, userId: string): Promise<CheckinRecordView[]> {
  const rows = await db
    .select()
    .from(dailyCheckin)
    .where(eq(dailyCheckin.userId, userId))
    .orderBy(desc(dailyCheckin.checkinDate), desc(dailyCheckin.createdAt))

  return rows.map(toCheckinRecordView)
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
