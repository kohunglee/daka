import type { DB } from '@/db/client'
import { ownedBy, type Scope } from '@/db/scope'
import { userCheckinSetting } from './log-template.schema'
import { CHECKIN_LOG_TEMPLATE_MAX_LENGTH } from './log-template.shared'

/** 读取用户模板；用户还没保存过模板时返回空字符串。 */
export async function getMyCheckinLogTemplate(db: DB, scope: Scope): Promise<string> {
  const rows = await db
    .select({ logTemplate: userCheckinSetting.logTemplate })
    .from(userCheckinSetting)
    .where(ownedBy(userCheckinSetting, scope))
    .limit(1)
  return rows[0]?.logTemplate ?? ''
}

/** 保存用户模板，使用用户主键冲突更新，保持每人只有一份配置。 */
export async function saveMyCheckinLogTemplate(db: DB, scope: Scope, logTemplate: string, now: number): Promise<string> {
  if (logTemplate.length > CHECKIN_LOG_TEMPLATE_MAX_LENGTH) throw new Error('log template is too long')
  const normalizedTemplate = logTemplate.trim()
  await db
    .insert(userCheckinSetting)
    .values({ userId: scope.ownerId, logTemplate: normalizedTemplate, updatedAt: new Date(now) })
    .onConflictDoUpdate({
      target: userCheckinSetting.userId,
      set: { logTemplate: normalizedTemplate, updatedAt: new Date(now) },
    })
  return normalizedTemplate
}

/** 服务端最终校验模板长度；空模板合法，表示不自动填充。 */
export function validateCheckinLogTemplate(value: string): string {
  if (value.length > CHECKIN_LOG_TEMPLATE_MAX_LENGTH) throw new Error('log template is too long')
  return value
}
