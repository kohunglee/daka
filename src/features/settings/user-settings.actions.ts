import { createServerFn } from '@tanstack/react-start'
import { redirect } from '@tanstack/react-router'
import { createDb } from '@/db/client'
import { env } from '@/lib/env'
import { readUser } from '@/features/auth/readUser.server'
import { MAX_BIO_LENGTH, countBioCharacters } from './settings.shared'
import { getUserSettings, setUserBio, setUserShowInPlaza, setUserTestSetting } from './user-settings.server'

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

/** 保存当前用户是否展示在广场；默认值由服务端兼容旧 JSON 并按 true 处理。 */
export const setMyShowInPlazaFn = createServerFn({ method: 'POST' })
  .validator((data: { enabled?: unknown }) => ({ enabled: data?.enabled !== false }))
  .handler(async ({ data }) => {
    const currentUser = await readUser()
    if (!currentUser) throw redirect({ to: '/{-$locale}/login' })
    return setUserShowInPlaza(createDb(env.DB), currentUser.id, data.enabled)
  })

/** 保存当前用户的个人简介；服务端再次限制 100 个字符，避免绕过前端 maxLength。 */
export const setMyBioFn = createServerFn({ method: 'POST' })
  .validator((data: { bio?: unknown }) => ({ bio: typeof data?.bio === 'string' ? data.bio : '' }))
  .handler(async ({ data }) => {
    const currentUser = await readUser()
    if (!currentUser) throw redirect({ to: '/{-$locale}/login' })
    if (countBioCharacters(data.bio) > MAX_BIO_LENGTH) throw new Error('个人简介最多 100 个字。')
    return setUserBio(createDb(env.DB), currentUser.id, data.bio)
  })
