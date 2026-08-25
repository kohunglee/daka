import { createServerFn } from '@tanstack/react-start'

export type JoinStatus = 'added' | 'already' | 'invalid-email' | 'captcha' | 'rate-limited'

// 公开无鉴权端点：validator 收紧类型（畸形 body 走 invalid-email 而不是 500），
// handler 里再加每 IP 限流（Turnstile 未配置时这是唯一的滥用阻尼）。
export const joinWaitlist = createServerFn({ method: 'POST' })
  .validator((d: { email: string; locale: string; turnstileToken: string; source?: string }) => {
    const o = (d ?? {}) as Record<string, unknown>
    return {
      email: typeof o.email === 'string' ? o.email : '',
      locale: typeof o.locale === 'string' ? o.locale : 'zh',
      turnstileToken: typeof o.turnstileToken === 'string' ? o.turnstileToken : '',
      source: typeof o.source === 'string' ? o.source : undefined,
    }
  })
  .handler(async ({ data }): Promise<{ status: JoinStatus }> => {
    const { env } = await import('@/lib/env')
    const { createDb } = await import('@/db/client')
    const { getRequestHeader } = await import('@tanstack/react-start/server')
    const { normalizeEmail, isValidEmail } = await import('./email')
    const { verifyTurnstile } = await import('./turnstile')
    const { upsertWaitlist } = await import('./upsert')
    const { clampSource } = await import('./source')
    const { fixedWindowLimit } = await import('./rate-limit')
    const { addContact } = await import('@/features/audience/audience')

    // 每 IP 10 次 / 10 分钟：容得下真人改错邮箱重试，挡得住脚本灌库/替他人报名。
    // KV 故障时放行（fail-open）：限流是阻尼不是安全边界，不能让它把报名打挂。
    try {
      const ip = getRequestHeader('cf-connecting-ip') ?? 'unknown'
      const allowed = await fixedWindowLimit(env.CACHE, `waitlist:${ip}`, 10, 600, Date.now())
      if (!allowed) return { status: 'rate-limited' }
    } catch (err) {
      console.error('[waitlist] rate limit check failed (allowing)', err)
    }

    // 邮箱格式先于 Turnstile 校验：token 一经 siteverify 即作废，若先消费再报 invalid-email，
    // 用户改正邮箱后的第二次提交会带着已消费的旧 token 莫名撞「验证码失败」。
    const email = normalizeEmail(data.email)
    if (!isValidEmail(email)) return { status: 'invalid-email' }

    const ok = await verifyTurnstile(data.turnstileToken, env.TURNSTILE_SECRET_KEY)
    if (!ok) return { status: 'captcha' }

    const locale = 'zh'
    const status = await upsertWaitlist(createDb(env.DB), {
      id: crypto.randomUUID(),
      email,
      locale,
      source: clampSource(data.source),
      now: new Date(),
    })

    try {
      await addContact(email)
    } catch (err) {
      console.error('[waitlist] audience sync failed', err)
    }

    return { status }
  })
