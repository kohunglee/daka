import { createServerFn } from '@tanstack/react-start'
import { redirect } from '@tanstack/react-router'
import { createDb } from '@/db/client'
import { env } from '@/lib/env'
import { readUser } from '@/features/auth/readUser.server'
import { getUserSettings, setUserTestSetting } from './user-settings.server'

/** 仅从当前会话读取个人配置，调用方无法传入或枚举其他用户 ID。 */
export const getMyUserSettingsFn = createServerFn({ method: 'GET' })
  .handler(async () => {
    const currentUser = await readUser()
    if (!currentUser) throw redirect({ to: '/{-$locale}/login' })
    return getUserSettings(createDb(env.DB), currentUser.id)
  })

/** 更新当前登录用户的测试设置；输入只接受严格的布尔值。 */
export const setMyUserTestSettingFn = createServerFn({ method: 'POST' })
  .validator((data: { enabled?: unknown }) => ({ enabled: data?.enabled === true }))
  .handler(async ({ data }) => {
    const currentUser = await readUser()
    if (!currentUser) throw redirect({ to: '/{-$locale}/login' })
    return setUserTestSetting(createDb(env.DB), currentUser.id, data.enabled)
  })
