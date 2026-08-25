import { test, expect } from 'vitest'
import { isEmailVerificationEnabled } from './auth.server'

/** 邮箱验证开关的优先级：显式关闭优先于邮件服务；恢复时必须同时开启开关与邮件服务。 */
test('邮箱验证开关可为 MVP 临时关闭并随时恢复', () => {
  const base = {
    BETTER_AUTH_SECRET: 'test-secret-for-email-verification-switch',
    BETTER_AUTH_URL: 'http://localhost:3001',
    RESEND_API_KEY: 'resend-test-key',
  }

  expect(isEmailVerificationEnabled({ ...base, EMAIL_VERIFICATION_ENABLED: 'false' })).toBe(false)
  expect(isEmailVerificationEnabled({ ...base, EMAIL_VERIFICATION_ENABLED: 'true' })).toBe(true)
  expect(isEmailVerificationEnabled({
    BETTER_AUTH_SECRET: base.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: base.BETTER_AUTH_URL,
    EMAIL_VERIFICATION_ENABLED: 'true',
  })).toBe(false)
})
