import { createServerFn } from '@tanstack/react-start'
import { redirect } from '@tanstack/react-router'
import { createDb } from '@/db/client'
import { scopeFromUser } from '@/db/scope'
import { env } from '@/lib/env'
import { readUser } from '@/features/auth/readUser.server'
import { getMyCheckinLogTemplate, saveMyCheckinLogTemplate, validateCheckinLogTemplate } from './log-template.server'

/** 未登录时统一跳转；读写模板都在服务端按当前会话确定用户。 */
async function currentUser() {
  const user = await readUser()
  if (!user) throw redirect({ to: '/{-$locale}/login' })
  return user
}

/** 读取当前用户的日志模板。 */
export const getMyCheckinLogTemplateFn = createServerFn({ method: 'GET' }).handler(async () => {
  const user = await currentUser()
  return getMyCheckinLogTemplate(createDb(env.DB), scopeFromUser(user.id))
})

/** 保存当前用户的日志模板。 */
export const saveMyCheckinLogTemplateFn = createServerFn({ method: 'POST' })
  .validator((data: { logTemplate: string }) => ({
    logTemplate: validateCheckinLogTemplate(typeof data?.logTemplate === 'string' ? data.logTemplate : ''),
  }))
  .handler(async ({ data }) => {
    const user = await currentUser()
    return saveMyCheckinLogTemplate(createDb(env.DB), scopeFromUser(user.id), data.logTemplate, Date.now())
  })
