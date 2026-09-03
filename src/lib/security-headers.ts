/**
 * Baseline security response headers, applied to every response by the custom
 * server entry (src/server.ts).
 *
 * The five always-on headers are universally safe. CSP is the only one that can
 * break an app, so it's prod-only (Vite dev needs eval/ws) and deliberately
 * permissive: TanStack Start inlines a hydration <script>, and React/Tailwind
 * emit inline styles, so 'unsafe-inline' is required until you wire nonces.
 * Tightening to a nonce-based policy is the recommended next step.
 */

const BASE_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  // Harmless over http (browsers ignore it); enforced once served over https.
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
}

const PROD_CSP = [
  "default-src 'self' https: data: blob:", // 未单独列出的资源类型也允许 HTTPS 外部资源
  "script-src 'self' 'unsafe-inline' https: data: blob:", // 允许任意 HTTPS 外部脚本，支持站长自定义统计和第三方组件
  "style-src 'self' 'unsafe-inline' https: data:", // 允许任意 HTTPS 外部样式
  "img-src 'self' data: blob: https:", // blob: for client-side avatar preview
  "font-src 'self' data: https:", // 允许任意 HTTPS 外部字体
  "connect-src 'self' https: wss:", // 允许任意 HTTPS/WSS 外部接口和实时连接
  "frame-src 'self' https: data: blob:", // 允许任意 HTTPS 外部 iframe
  "media-src 'self' https: data: blob:", // 允许任意 HTTPS 外部音视频
  "worker-src 'self' https: blob:", // 允许任意 HTTPS 外部 Worker
  "manifest-src 'self' https:", // 允许任意 HTTPS 外部 Web App Manifest
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ')

/** Return a copy of `res` with security headers added. Leaves the body untouched (streams pass through). */
export function withSecurityHeaders(res: Response): Response {
  // Never rewrap a protocol upgrade (e.g. dev HMR websockets).
  const isUpgrade = res.status === 101 || (res as { webSocket?: unknown }).webSocket != null
  if (isUpgrade) return res

  const headers = new Headers(res.headers)
  for (const [key, value] of Object.entries(BASE_HEADERS)) headers.set(key, value)
  if (import.meta.env.PROD && !headers.has('Content-Security-Policy')) {
    headers.set('Content-Security-Policy', PROD_CSP)
  }
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers })
}
