import { test, expect, vi, afterEach } from 'vitest'
import { withSecurityHeaders } from './security-headers'

afterEach(() => vi.unstubAllEnvs())

const BASE = [
  'x-content-type-options',
  'x-frame-options',
  'referrer-policy',
  'permissions-policy',
  'strict-transport-security',
]

test('adds the baseline security headers and preserves status + body', async () => {
  const res = withSecurityHeaders(new Response('hello', { status: 200 }))
  for (const h of BASE) expect(res.headers.get(h)).toBeTruthy()
  expect(res.headers.get('x-frame-options')).toBe('DENY')
  expect(res.status).toBe(200)
  expect(await res.text()).toBe('hello')
})

test('CSP is omitted in dev (PROD=false)', () => {
  vi.stubEnv('PROD', false)
  const res = withSecurityHeaders(new Response('x'))
  expect(res.headers.get('content-security-policy')).toBeNull()
})

test('CSP is set in production and allows arbitrary HTTPS external resources', () => {
  vi.stubEnv('PROD', true)
  const csp = withSecurityHeaders(new Response('x')).headers.get('content-security-policy')
  expect(csp).toContain("default-src 'self' https:")
  expect(csp).toContain("script-src 'self' 'unsafe-inline' https:") // 任意 HTTPS 外部脚本
  expect(csp).toContain("connect-src 'self' https: wss:") // 任意 HTTPS/WSS 外部连接
  expect(csp).toContain("frame-src 'self' https:") // 任意 HTTPS iframe
  expect(csp).toContain("frame-ancestors 'none'")
  expect(csp).toContain("object-src 'none'")
})

test('protocol upgrades (101 / websocket) pass through untouched', () => {
  // A real 101 Response can't be constructed in undici, and a CF websocket
  // response carries a `webSocket` field — mock both shapes the guard checks.
  const status101 = { status: 101 } as unknown as Response
  expect(withSecurityHeaders(status101)).toBe(status101) // returned as-is
  const wsResponse = { status: 200, webSocket: {} } as unknown as Response
  expect(withSecurityHeaders(wsResponse)).toBe(wsResponse)
})

test('does not clobber a Content-Security-Policy already set', () => {
  vi.stubEnv('PROD', true)
  const res = withSecurityHeaders(
    new Response('x', { headers: { 'content-security-policy': "default-src 'none'" } }),
  )
  expect(res.headers.get('content-security-policy')).toBe("default-src 'none'")
})
