import { createServerFn } from '@tanstack/react-start'
import { redirect } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'
import { createDb } from '@/db/client'
import { env } from '@/lib/env'
import { readUser } from '@/features/auth/readUser.server'
import { dailyCheckin } from './checkin.schema'
import { checkinImageObjectKey, putCheckinImage } from './checkin.storage'
import {
  calculateCurrentStreak,
  formatBeijingDate,
  isValidCheckinDate,
  MAX_CHECKIN_IMAGE_BYTES,
  type CheckinCalendarSummary,
  type SubmitCheckinResult,
} from './checkin.shared'
import { getPublicCheckin, getUserCheckin, getYearCheckinData, parseCheckinNumbers, validateCheckinFields, validateYear } from './checkin.server'

/** 未登录时只返回空日历；打卡动作本身仍然会跳转登录。 */
export const getYearCheckinSummaryFn = createServerFn({ method: 'GET' })
  .validator((data: { year: number }) => data)
  .handler(async ({ data }): Promise<CheckinCalendarSummary> => {
    if (!validateYear(data.year)) throw new Error('Invalid calendar year')
    const user = await readUser()
    if (!user) return { authenticated: false, year: data.year, checkedDates: [], currentStreak: 0 }
    const result = await getYearCheckinData(createDb(env.DB), user.id, data.year)
    return { authenticated: true, year: data.year, ...result }
  })

/** 登录用户点击红色日期时读取自己的完整只读记录。 */
export const getMyCheckinDetailFn = createServerFn({ method: 'GET' })
  .validator((data: { date: string }) => data)
  .handler(async ({ data }) => {
    const user = await readUser()
    if (!user) throw redirect({ to: '/{-$locale}/login' })
    return getUserCheckin(createDb(env.DB), user.id, data.date)
  })

/** 公开链接使用 userId/date 读取单条记录，不提供按用户枚举记录的接口。 */
export const getPublicCheckinDetailFn = createServerFn({ method: 'GET' })
  .validator((data: { userId: string; date: string }) => data)
  .handler(async ({ data }) => {
    if (!data.userId || data.userId.includes('/') || !isValidCheckinDate(data.date)) return null
    return getPublicCheckin(createDb(env.DB), data.userId, data.date)
  })

/**
 * 提交今日打卡：服务端按北京时间锁定日期，先检查幂等记录，再写 R2 和 D1。
 * R2/D1 不是同一事务；D1 写入异常且确认没有并发成功记录时才清理 R2 对象。
 */
export const submitCheckinFn = createServerFn({ method: 'POST' })
  .validator((data: FormData) => data)
  .handler(async ({ data }): Promise<SubmitCheckinResult> => {
    const user = await readUser()
    if (!user) throw redirect({ to: '/{-$locale}/login' })

    const image = data.get('image')
    const hours = data.get('hours')
    const backlinks = data.get('backlinks')
    const quality = data.get('quality')
    const log = data.get('log')
    if (!(image instanceof File) || typeof hours !== 'string' || typeof backlinks !== 'string' || typeof quality !== 'string' || typeof log !== 'string') {
      return { status: 'validation_error', message: '打卡表单不完整，请重新填写。' }
    }

    const check = validateCheckinFields({ image, hours, backlinks, quality, log })
    if (!check.ok) return { status: 'validation_error', message: check.message }

    const checkinDate = formatBeijingDate()
    const db = createDb(env.DB)
    const existing = await getUserCheckin(db, user.id, checkinDate)
    if (existing) {
      const history = await db.select({ checkinDate: dailyCheckin.checkinDate }).from(dailyCheckin).where(eq(dailyCheckin.userId, user.id))
      return { status: 'already_checked_in', record: existing, currentStreak: calculateCurrentStreak(history.map((row) => row.checkinDate)) }
    }

    const imageKey = checkinImageObjectKey(user.id, checkinDate)
    try {
      await putCheckinImage(env.BUCKET, user.id, checkinDate, await image.arrayBuffer())
      const numbers = parseCheckinNumbers({ hours, backlinks, quality })
      const row = {
        id: crypto.randomUUID(),
        userId: user.id,
        checkinDate,
        ...numbers,
        log,
        imageKey,
        imageBytes: image.size,
        createdAt: new Date(),
      }
      await db.insert(dailyCheckin).values(row)
      const history = await db.select({ checkinDate: dailyCheckin.checkinDate }).from(dailyCheckin).where(eq(dailyCheckin.userId, user.id))
      const saved = await getUserCheckin(db, user.id, checkinDate)
      if (!saved) return { status: 'save_error', message: '打卡记录保存后读取失败，请稍后重试。' }
      return { status: 'created', record: saved, currentStreak: calculateCurrentStreak(history.map((entry) => entry.checkinDate)) }
    } catch (error) {
      const concurrent = await getUserCheckin(db, user.id, checkinDate)
      if (concurrent) {
        const history = await db.select({ checkinDate: dailyCheckin.checkinDate }).from(dailyCheckin).where(eq(dailyCheckin.userId, user.id))
        return { status: 'already_checked_in', record: concurrent, currentStreak: calculateCurrentStreak(history.map((row) => row.checkinDate)) }
      }
      try {
        await env.BUCKET.delete(imageKey)
      } catch (cleanupError) {
        console.error('[checkin] orphan image cleanup failed', cleanupError)
      }
      console.error('[checkin] submit failed', error)
      return { status: 'save_error', message: `保存失败，请保留表单内容后重试（图片上限 ${MAX_CHECKIN_IMAGE_BYTES / 1024}KB）。` }
    }
  })
