import { Resend } from 'resend'
import { renderEmail } from './templates'
import { createDevTransport, type SentEmail } from './dev-transport'
import type { Locale } from '@/features/i18n/locale'

export interface SendEmailInput {
  to: string
  locale: Locale
  template: 'verify-email' | 'reset-password' | 'pro-activated'
  data: { url: string }
}

interface Transport {
  send(email: SentEmail): Promise<void>
}

/** Resend 纯文本测试邮件的最小载荷，避免测试邮件依赖业务模板。 */
export interface ResendMessageInput {
  to: string
  subject: string
  text: string
}

/** 统一处理 Resend SDK 的返回错误；SDK 遇到 API 错误时不会主动 throw。 */
async function sendThroughResend(
  apiKey: string,
  from: string,
  email: ResendMessageInput | SentEmail,
): Promise<void> {
  const resend = new Resend(apiKey)
  const result = 'html' in email
    ? await resend.emails.send({ from, to: email.to, subject: email.subject, html: email.html, text: email.text })
    : await resend.emails.send({ from, to: email.to, subject: email.subject, text: email.text })
  if (result.error) throw new Error(`Resend send failed: ${result.error.name}: ${result.error.message}`)
}

/** 可注入 transport 的内部实现（便于测试）。 */
export async function sendEmailWith(transport: Transport, input: SendEmailInput): Promise<void> {
  const rendered = await renderEmail(input)
  await transport.send({ to: input.to, subject: rendered.subject, html: rendered.html, text: rendered.text })
}

/** Exported for tests. Resend's SDK reports API failures via `{ error }` instead of
 *  throwing — without this check a bad EMAIL_FROM or a rate-limit silently drops
 *  verify/reset emails while better-auth believes they were sent. */
export function resendTransport(apiKey: string, from: string): Transport {
  return {
    async send(email) { await sendThroughResend(apiKey, from, email) },
  }
}

/** 使用当前 Worker 的 RESEND_API_KEY 发送管理员手工填写的测试邮件。 */
export async function sendResendMessage(email: ResendMessageInput): Promise<void> {
  const { env } = await import('@/lib/env')
  const apiKey = env.RESEND_API_KEY.trim()
  if (!apiKey) throw new Error('RESEND_API_KEY 未配置，暂时无法发送测试邮件。')
  const from = env.EMAIL_FROM || '打卡润 <onboarding@resend.dev>'
  await sendThroughResend(apiKey, from, email)
}

/** 生产入口：有 RESEND_API_KEY 则用 Resend，否则降级到控制台捕获（本地不误发）。 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  // Dynamic import keeps cloudflare:workers out of the module graph in node/test environments.
  const { env } = await import('@/lib/env')
  const apiKey = env.RESEND_API_KEY
  const from = env.EMAIL_FROM || '打卡润 <onboarding@resend.dev>'
  // 生产构建里降级路径要脱敏（import.meta.env.PROD 由 vite 构建期注入；vite dev 为 false，
  // 本地开发照旧在控制台拿到完整链接）。
  const transport: Transport = apiKey ? resendTransport(apiKey, from) : createDevTransport({ redactBody: import.meta.env.PROD })
  await sendEmailWith(transport, input)
}
