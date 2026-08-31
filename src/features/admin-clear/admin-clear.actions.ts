/**
 * 隐藏管理员页的服务端动作。
 * 只提供用户搜索、单日预览和 D1/R2 双清理，不暴露普通用户登录信息。
 */
import { createServerFn } from '@tanstack/react-start'
import { and, count, desc, eq, like, or } from 'drizzle-orm'
import { createDb } from '@/db/client'
import { env } from '@/lib/env'
import { user } from '@/features/auth/auth.schema'
import { dailyCheckin } from '@/features/checkin/checkin.schema'
import { isValidCheckinDate } from '@/features/checkin/checkin.shared'
import { clampPage } from '@/features/admin/params'
import { getAdminUsers, type AdminUserRow, type AdminUsersParams } from '@/features/admin/getAdminUsers'
import { hasAdminSession, loginAdmin, requireAdminSession } from './admin-clear.auth.server'

/** 管理员搜索结果，只返回定位用户所需的公开字段。 */
export interface AdminClearUserRow {
  id: string
  name: string
  email: string
}

/** 单日打卡预览，删除前让管理员确认目标是否准确。 */
export interface AdminClearPreview {
  id: string
  userId: string
  userName: string | null
  userEmail: string | null
  checkinDate: string
  imageKey: string
  imageBytes: number
  hours: string
  backlinks: string
  quality: number
  logLength: number
  createdAt: string
}

/** 管理员列表分页结果；每页固定 50 条，避免一次加载过多记录。 */
export interface AdminClearRecordPage {
  rows: AdminClearPreview[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

const ADMIN_RECORD_PAGE_SIZE = 50
const ADMIN_USER_PAGE_SIZE = 50

/** 注册用户管理列表，分页大小固定为 50，避免隐藏后台一次读取过多账号。 */
export interface AdminUserPage {
  rows: AdminUserRow[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

/** 把数据库行转换成列表和预览共用的安全展示结构。 */
function toAdminClearPreview(row: {
  id: string
  userId: string
  userName: string | null
  userEmail: string | null
  checkinDate: string
  imageKey: string
  imageBytes: number
  hours: string
  backlinks: string
  quality: number
  log: string
  createdAt: Date
}): AdminClearPreview {
  return {
    id: row.id,
    userId: row.userId,
    userName: row.userName,
    userEmail: row.userEmail,
    checkinDate: row.checkinDate,
    imageKey: row.imageKey,
    imageBytes: row.imageBytes,
    hours: row.hours,
    backlinks: row.backlinks,
    quality: row.quality,
    logLength: Array.from(row.log).length,
    createdAt: row.createdAt.toISOString(),
  }
}

/** 管理员页读取当前会话状态，不泄露密码配置。 */
export const getAdminClearSessionFn = createServerFn({ method: 'GET' }).handler(async () => ({
  authenticated: await hasAdminSession(),
}))

/** 校验管理员密码并建立短期会话。 */
export const loginAdminClearFn = createServerFn({ method: 'POST' })
  .validator((data: { password?: unknown }) => ({
    password: typeof data?.password === 'string' ? data.password.slice(0, 200) : '',
  }))
  .handler(async ({ data }) => ({ authenticated: await loginAdmin(data.password) }))

/** 搜索用户：支持用户 ID、邮箱和昵称，最多返回 20 条。 */
export const searchAdminClearUsersFn = createServerFn({ method: 'GET' })
  .validator((data: { query?: unknown }) => ({
    query: typeof data?.query === 'string' ? data.query.trim().slice(0, 100) : '',
  }))
  .handler(async ({ data }): Promise<AdminClearUserRow[]> => {
    await requireAdminSession()
    if (!data.query) return []

    const db = createDb(env.DB)
    return db
      .select({ id: user.id, name: user.name, email: user.email })
      .from(user)
      .where(or(like(user.id, `%${data.query}%`), like(user.name, `%${data.query}%`), like(user.email, `%${data.query}%`)))
      .orderBy(desc(user.createdAt))
      .limit(20)
  })

/** 隐藏 666 管理中心读取注册用户；与普通管理员列表共用查询实现，但权限改为隐藏管理员会话。 */
export const listAdminUsersForHiddenFn = createServerFn({ method: 'GET' })
  .validator((data: { q?: unknown; page?: unknown }) => ({
    q: typeof data?.q === 'string' ? data.q.trim().slice(0, 200) : undefined,
    page: clampPage(data?.page),
  }))
  .handler(async ({ data }): Promise<AdminUserPage> => {
    await requireAdminSession()
    const params: AdminUsersParams = {
      page: data.page,
      pageSize: ADMIN_USER_PAGE_SIZE,
      sortBy: 'createdAt',
      sortDir: 'desc',
      ...(data.q ? { q: data.q } : {}),
    }
    const result = await getAdminUsers(createDb(env.DB), env.STRIPE_SECRET_KEY, params)
    return {
      rows: result.rows,
      page: data.page,
      pageSize: ADMIN_USER_PAGE_SIZE,
      total: result.total,
      totalPages: Math.max(1, Math.ceil(result.total / ADMIN_USER_PAGE_SIZE)),
    }
  })

/** 分页列出当前数据库里的全部打卡记录，默认按日期从新到旧排列。 */
export const listAdminCheckinsFn = createServerFn({ method: 'GET' })
  .validator((data: { page?: unknown }) => ({
    page: typeof data?.page === 'number' && Number.isInteger(data.page) ? Math.max(0, data.page) : 0,
  }))
  .handler(async ({ data }): Promise<AdminClearRecordPage> => {
    await requireAdminSession()
    const db = createDb(env.DB)
    const offset = data.page * ADMIN_RECORD_PAGE_SIZE
    const [rows, totalRows] = await Promise.all([
      db
        .select({
          id: dailyCheckin.id,
          userId: dailyCheckin.userId,
          userName: user.name,
          userEmail: user.email,
          checkinDate: dailyCheckin.checkinDate,
          imageKey: dailyCheckin.imageKey,
          imageBytes: dailyCheckin.imageBytes,
          hours: dailyCheckin.hours,
          backlinks: dailyCheckin.backlinks,
          quality: dailyCheckin.quality,
          log: dailyCheckin.log,
          createdAt: dailyCheckin.createdAt,
        })
        .from(dailyCheckin)
        .leftJoin(user, eq(user.id, dailyCheckin.userId))
        .orderBy(desc(dailyCheckin.checkinDate), desc(dailyCheckin.createdAt))
        .limit(ADMIN_RECORD_PAGE_SIZE)
        .offset(offset),
      db.select({ total: count() }).from(dailyCheckin),
    ])
    const total = totalRows[0]?.total ?? 0
    return {
      rows: rows.map(toAdminClearPreview),
      page: data.page,
      pageSize: ADMIN_RECORD_PAGE_SIZE,
      total,
      totalPages: Math.max(1, Math.ceil(total / ADMIN_RECORD_PAGE_SIZE)),
    }
  })

/** 预览指定用户指定日期的打卡记录，不读取图片正文。 */
export const previewAdminCheckinFn = createServerFn({ method: 'GET' })
  .validator((data: { userId?: unknown; date?: unknown }) => ({
    userId: typeof data?.userId === 'string' ? data.userId.trim().slice(0, 200) : '',
    date: typeof data?.date === 'string' ? data.date : '',
  }))
  .handler(async ({ data }): Promise<AdminClearPreview | null> => {
    await requireAdminSession()
    if (!data.userId || !isValidCheckinDate(data.date)) return null

    const rows = await createDb(env.DB)
      .select({
        id: dailyCheckin.id,
        userId: dailyCheckin.userId,
        userName: user.name,
        userEmail: user.email,
        checkinDate: dailyCheckin.checkinDate,
        imageKey: dailyCheckin.imageKey,
        imageBytes: dailyCheckin.imageBytes,
        hours: dailyCheckin.hours,
        backlinks: dailyCheckin.backlinks,
        quality: dailyCheckin.quality,
        log: dailyCheckin.log,
        createdAt: dailyCheckin.createdAt,
      })
      .from(dailyCheckin)
      .leftJoin(user, eq(user.id, dailyCheckin.userId))
      .where(and(eq(dailyCheckin.userId, data.userId), eq(dailyCheckin.checkinDate, data.date)))
      .limit(1)

    const row = rows[0]
    return row ? toAdminClearPreview(row) : null
  })

/** 删除指定日期的 R2 图片和 D1 记录；确认标记由前端二次确认后传入。 */
export const clearAdminCheckinFn = createServerFn({ method: 'POST' })
  .validator((data: { userId?: unknown; date?: unknown; confirmed?: unknown }) => ({
    userId: typeof data?.userId === 'string' ? data.userId.trim().slice(0, 200) : '',
    date: typeof data?.date === 'string' ? data.date : '',
    confirmed: data?.confirmed === true,
  }))
  .handler(async ({ data }): Promise<{ status: 'deleted' | 'not_found'; imageKey?: string }> => {
    await requireAdminSession()
    if (!data.userId || !isValidCheckinDate(data.date) || !data.confirmed) throw new Error('删除参数无效。')

    const db = createDb(env.DB)
    const rows = await db
      .select({ id: dailyCheckin.id, imageKey: dailyCheckin.imageKey })
      .from(dailyCheckin)
      .where(and(eq(dailyCheckin.userId, data.userId), eq(dailyCheckin.checkinDate, data.date)))
      .limit(1)
    const row = rows[0]
    if (!row) return { status: 'not_found' }

    // 先删 R2，若 D1 删除失败，管理员可以重复执行同一目标完成清理。
    await env.BUCKET.delete(row.imageKey)
    await db.delete(dailyCheckin).where(eq(dailyCheckin.id, row.id))
    return { status: 'deleted', imageKey: row.imageKey }
  })
