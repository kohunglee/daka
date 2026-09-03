/**
 * 666 管理中心的测试邮件服务端动作。
 * 所有请求先检查隐藏管理员会话，再由服务端调用当前的 Resend 配置。
 */
import { createServerFn } from '@tanstack/react-start'
import { requireAdminSession } from '@/features/admin-clear/admin-clear.auth.server'
import { sendResendMessage } from './email.server'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** 校验并限制测试邮件表单输入，避免把异常大请求转发给外部接口。 */
function validateTestEmailInput(data: { to?: unknown; subject?: unknown; text?: unknown }) {
  const to = typeof data?.to === 'string' ? data.to.trim().slice(0, 320) : ''
  const subject = typeof data?.subject === 'string' ? data.subject.trim().slice(0, 200) : ''
  const text = typeof data?.text === 'string' ? data.text.slice(0, 20_000) : ''

  if (!EMAIL_PATTERN.test(to)) throw new Error('请输入有效的收件人邮箱地址。')
  if (!subject) throw new Error('邮件标题不能为空。')
  if (!text.trim()) throw new Error('邮件内容不能为空。')
  return { to, subject, text }
}

/** 仅供 666 管理中心使用的测试邮件发送动作，与正式邮件共用 RESEND_API_KEY。 */
export const sendTestEmailFn = createServerFn({ method: 'POST' })
  .validator(validateTestEmailInput)
  .handler(async ({ data }): Promise<{ sentTo: string }> => {
    await requireAdminSession()
    await sendResendMessage(data)
    return { sentTo: data.to }
  })
