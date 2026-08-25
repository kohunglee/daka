/**
 * 隐藏管理员页的轻量会话。
 *
 * 管理员页不依赖普通用户登录，但删除动作不能只相信前端状态。
 * 这里用管理员密码签发短期 HMAC Cookie，服务端每次操作都会重新校验。
 */
import { getRequestHeader, setResponseHeader } from '@tanstack/react-start/server'
import { env } from '@/lib/env'

/** 管理员入口的固定乱码路径；不出现在站内链接和 sitemap 中。 */
export const HIDDEN_ADMIN_PATH = '/n4v8q2m7x9r3k6p1'

/** 会话 Cookie 名称与有效期。 */
const ADMIN_COOKIE_NAME = 'flarestarter_admin_session'
const ADMIN_SESSION_SECONDS = 60 * 60
const LOCAL_ADMIN_PASSWORD = 'wanghao123'

/** 将二进制签名编码成适合放在 Cookie 中的 Base64URL。 */
function encodeBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

/** 将 Cookie 中的 Base64URL 签名还原成字节数组。 */
function decodeBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = `${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`
  const binary = atob(padded)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

/** 读取管理员密码：本地缺省值仅用于开发，线上必须配置环境变量。 */
function getAdminPassword(): string {
  const configured = env.ADMIN_PASSWORD.trim()
  if (configured) return configured
  return import.meta.env.DEV ? LOCAL_ADMIN_PASSWORD : ''
}

/** 根据管理员密码生成 HMAC 密钥。密码本身不会写入 Cookie。 */
async function getSigningKey(password: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

/** 生成签名后的过期时间载荷。 */
async function signExpiry(expiresAt: number, password: string): Promise<string> {
  const payload = String(expiresAt)
  const key = await getSigningKey(password)
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return `${payload}.${encodeBase64Url(new Uint8Array(signature))}`
}

/** 从请求 Cookie 中取出指定名称的值。 */
function readCookie(name: string): string | null {
  const cookieHeader = getRequestHeader('cookie') ?? ''
  for (const segment of cookieHeader.split(';')) {
    const separator = segment.indexOf('=')
    if (separator < 0) continue
    if (segment.slice(0, separator).trim() === name) return segment.slice(separator + 1).trim()
  }
  return null
}

/** 检查请求是否携带仍在有效期内的管理员 HMAC Cookie。 */
export async function hasAdminSession(): Promise<boolean> {
  const password = getAdminPassword()
  const token = readCookie(ADMIN_COOKIE_NAME)
  if (!password || !token) return false

  const [expiryText, signatureText] = token.split('.')
  const expiresAt = Number(expiryText)
  if (!Number.isInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000) || !signatureText) return false

  try {
    const key = await getSigningKey(password)
    const signatureBytes = decodeBase64Url(signatureText)
    const signatureBuffer = new ArrayBuffer(signatureBytes.byteLength)
    new Uint8Array(signatureBuffer).set(signatureBytes)
    return crypto.subtle.verify(
      'HMAC',
      key,
      signatureBuffer,
      new TextEncoder().encode(expiryText),
    )
  } catch {
    return false
  }
}

/** 校验登录密码并签发一小时 HttpOnly 会话 Cookie。 */
export async function loginAdmin(password: string): Promise<boolean> {
  const expected = getAdminPassword()
  if (!expected || password !== expected) return false

  const expiresAt = Math.floor(Date.now() / 1000) + ADMIN_SESSION_SECONDS
  const token = await signExpiry(expiresAt, expected)
  const secure = getRequestHeader('x-forwarded-proto') === 'https' ? '; Secure' : ''
  setResponseHeader(
    'Set-Cookie',
    `${ADMIN_COOKIE_NAME}=${token}; Path=/; Max-Age=${ADMIN_SESSION_SECONDS}; HttpOnly; SameSite=Strict${secure}`,
  )
  return true
}

/** 所有管理员数据操作统一调用的服务端门禁。 */
export async function requireAdminSession(): Promise<void> {
  if (!(await hasAdminSession())) throw new Error('管理员会话已失效，请重新输入密码。')
}
