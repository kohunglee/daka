/**
 * Shared server-only helper: read the authenticated user from the current
 * request's session cookie. Returns null if unauthenticated.
 *
 * This is a plain async function (not a createServerFn wrapper) so it can be
 * called directly from other server-fn handlers without double-invoking the
 * RPC bridge. The `.server.ts` suffix ensures the bundler never includes this
 * in the client bundle.
 */
import { eq } from 'drizzle-orm'
import { getRequestHeader } from '@tanstack/react-start/server'
import { env } from '@/lib/env'
import { createDb } from '@/db/client'
import { account } from './auth.schema'
import { createAuth } from './auth.server'

/**
 * 服务端读取当前已登录用户的核心方法。
 * 从当前请求的 session cookie 中解析用户，并连同其已绑定的登录方式（google、github、credential）一同返回。
 */
export async function readUser(opts?: {
  /** 跳过 5 分钟 cookie 缓存、强制查库——权限敏感的门禁（如 admin 面）用，
   *  封禁/降权即时生效而不是等缓存过期。 */
  fresh?: boolean
}): Promise<{
  id: string
  email: string
  name: string
  image?: string | null
  role?: string | null
  /** 登录渠道/方式列表，例如 ['google']、['github']、['credential'] */
  providers: string[]
} | null> {
  const cookie = getRequestHeader('cookie') ?? ''
  const headers = new Headers({ cookie })
  const db = createDb(env.DB)
  const auth = createAuth(env, db)
  const session = await auth.api.getSession(
    opts?.fresh ? { headers, query: { disableCookieCache: true } } : { headers },
  )
  if (!session?.user) return null
  const u = session.user

  // 读取当前用户在 account 表中记录的全部登录授权渠道
  const accountRows = await db
    .select({ providerId: account.providerId })
    .from(account)
    .where(eq(account.userId, u.id))
  const providers = Array.from(new Set(accountRows.map((a) => a.providerId)))

  return { id: u.id, email: u.email, name: u.name, image: u.image, role: u.role, providers }
}
