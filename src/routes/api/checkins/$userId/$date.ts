import { createFileRoute } from '@tanstack/react-router'
import { and, eq } from 'drizzle-orm'
import { createDb } from '@/db/client'
import { dailyCheckin } from '@/features/checkin/checkin.schema'
import { env } from '@/lib/env'
import { getCheckinImageByKey } from '@/features/checkin/checkin.storage'
import { isValidCheckinDate } from '@/features/checkin/checkin.shared'

/**
 * 公开读取单条打卡截图。
 * 本轮采用 userId/date 地址，R2 仍保持私有，由 Worker 负责流式输出图片。
 */
const handler = async ({ params }: { params: { userId: string; date: string } }) => {
  if (!params.userId || params.userId.includes('/') || !isValidCheckinDate(params.date)) {
    return new Response('Not found', { status: 404 })
  }

  const rows = await createDb(env.DB)
    .select({ imageKey: dailyCheckin.imageKey })
    .from(dailyCheckin)
    .where(and(eq(dailyCheckin.userId, params.userId), eq(dailyCheckin.checkinDate, params.date)))
    .limit(1)
  const object = rows[0] ? await getCheckinImageByKey(env.BUCKET, rows[0].imageKey) : null
  if (!object) return new Response('Not found', { status: 404 })

  const headers = new Headers()
  headers.set('Content-Type', object.httpMetadata?.contentType ?? 'image/jpeg')
  headers.set('ETag', object.httpEtag)
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  return new Response(object.body, { headers })
}

export const Route = createFileRoute('/api/checkins/$userId/$date')({
  server: { handlers: { GET: handler } },
})
