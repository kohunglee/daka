/**
 * Server-side admin user list: queries the user table directly with Drizzle
 * (search by email, name, or ID, whitelisted sort, pagination) and left-joins each
 * row's `subscription` (customerId/plan/status) + a Stripe dashboard URL.
 *
 * Deliberately NOT `auth.api.listUsers`: that endpoint re-checks the session's
 * DB role, which breaks for admins granted via ADMIN_EMAILS after signup, and
 * it can only search one field at a time. Authorization is the caller's job —
 * every server-fn entry point gates with assertAdmin() (see ./middleware).
 * Plain async fn (no react-start import) so it is workers-testable.
 */
import { count, desc, asc, or, eq, sql, inArray } from 'drizzle-orm'
import type { DB } from '@/db/client'
import { user, account } from '@/features/auth/auth.schema'
import { subscription } from '@/features/billing/billing.schema'
import { stripeCustomerUrl } from '@/features/billing/stripe-dashboard'

/**
 * 管理员后台用户行数据结构。
 * 包含基础信息、封禁状态、Stripe 订阅信息以及登录渠道/绑定方式（如 google、github、credential）。
 */
export interface AdminUserRow {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image: string | null
  role: string | null
  banned: boolean | null
  banReason: string | null
  banExpires: Date | string | null
  createdAt: Date | string
  updatedAt: Date | string
  customerId: string | null
  plan: string | null
  status: string | null
  stripeUrl: string | null
  /** 登录渠道列表，例如 ['google', 'github', 'credential'] */
  providers: string[]
}

export interface AdminUsersParams {
  q?: string
  page: number
  pageSize: number
  sortBy: string
  sortDir: 'asc' | 'desc'
}

const SORT_COLUMNS = { name: user.name, email: user.email, createdAt: user.createdAt } as const

/**
 * 查询管理员用户列表。
 * 支持关键词搜索（邮箱、昵称、ID）、白名单排序、分页，并关联查询订阅与登录方式。
 */
export async function getAdminUsers(
  db: DB,
  secretKey: string | undefined,
  params: AdminUsersParams,
): Promise<{ rows: AdminUserRow[]; total: number }> {
  const pattern = params.q ? `%${params.q.replace(/[%_!]/g, '!$&')}%` : null
  const where = pattern
    ? or(
        sql`${user.email} LIKE ${pattern} ESCAPE '!'`,
        sql`${user.name} LIKE ${pattern} ESCAPE '!'`,
        sql`${user.id} LIKE ${pattern} ESCAPE '!'`,
      )
    : undefined
  const sortCol = SORT_COLUMNS[params.sortBy as keyof typeof SORT_COLUMNS] ?? user.createdAt
  const orderBy = params.sortDir === 'asc' ? asc(sortCol) : desc(sortCol)

  const [listed, [{ c: total }]] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
        role: user.role,
        banned: user.banned,
        banReason: user.banReason,
        banExpires: user.banExpires,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        customerId: subscription.customerId,
        plan: subscription.plan,
        status: subscription.status,
      })
      .from(user)
      .leftJoin(subscription, eq(subscription.userId, user.id))
      .where(where)
      .orderBy(orderBy)
      .limit(params.pageSize)
      .offset(params.page * params.pageSize),
    db.select({ c: count() }).from(user).where(where),
  ])

  // 查询当前页用户的全部登录授权渠道（如 google、github、credential）
  const userIds = listed.map((u) => u.id)
  const accountRows =
    userIds.length > 0
      ? await db
          .select({ userId: account.userId, providerId: account.providerId })
          .from(account)
          .where(inArray(account.userId, userIds))
      : []

  // 按 userId 聚合登录渠道
  const providersMap = new Map<string, string[]>()
  for (const acc of accountRows) {
    const list = providersMap.get(acc.userId) ?? []
    if (!list.includes(acc.providerId)) list.push(acc.providerId)
    providersMap.set(acc.userId, list)
  }

  const livemode = !!secretKey && (secretKey.startsWith('sk_live_') || secretKey.startsWith('rk_live_'))

  const rows: AdminUserRow[] = listed.map((u) => ({
    ...u,
    stripeUrl: u.customerId ? stripeCustomerUrl(u.customerId, livemode) : null,
    providers: providersMap.get(u.id) ?? [],
  }))

  return { rows, total: Number(total) }
}
