/**
 * 打卡截图的 R2 Key 与读写封装。
 * Key 使用用户 ID + 北京日期，和本轮确定的公开详情地址保持一致。
 */

/** 生成某位用户某天的唯一截图 Key。 */
export function checkinImageObjectKey(userId: string, checkinDate: string): string {
  return `checkins/${userId}/${checkinDate}.jpg`
}

/** 保存已经在前端压缩完成的 JPEG 截图。 */
export async function putCheckinImage(
  bucket: R2Bucket,
  userId: string,
  checkinDate: string,
  body: ArrayBuffer,
): Promise<string> {
  const key = checkinImageObjectKey(userId, checkinDate)
  await bucket.put(key, body, {
    httpMetadata: {
      contentType: 'image/jpeg',
      cacheControl: 'public, max-age=31536000, immutable',
    },
  })
  return key
}

/** 读取公开详情页所需的截图对象。 */
export function getCheckinImage(
  bucket: R2Bucket,
  userId: string,
  checkinDate: string,
): Promise<R2ObjectBody | null> {
  return bucket.get(checkinImageObjectKey(userId, checkinDate))
}

/** 按 D1 中保存的 Key 读取图片，支持后续手动维护 image_key。 */
export function getCheckinImageByKey(bucket: R2Bucket, imageKey: string): Promise<R2ObjectBody | null> {
  return bucket.get(imageKey)
}
