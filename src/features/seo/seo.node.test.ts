import { test, expect } from 'vitest'
import { buildRobots, buildSitemap, localeHead } from '@/features/seo/seo'
import { localizePath } from '@/features/i18n/locale'

const origin = 'https://app.example.com'

test('localizePath: 中文使用无前缀规范 URL', () => {
  expect(localizePath('zh', '/')).toBe('/')
  expect(localizePath('zh', '/pricing')).toBe('/pricing')
})

test('robots disallows app/admin/api + lists sitemap', () => {
  const r = buildRobots(origin)
  expect(r).toContain('Disallow: /*/app')
  expect(r).toContain('Disallow: /app')
  expect(r).toContain('Disallow: /*/admin')
  expect(r).toContain('Disallow: /api')
  expect(r).toContain(`Sitemap: ${origin}/sitemap.xml`)
})

test('sitemap 只列出中文公开页面', () => {
  const xml = buildSitemap(origin)
  expect(xml).toContain('<urlset')
  expect(xml).toContain(`<loc>${origin}/</loc>`)
  expect(xml).toContain(`<loc>${origin}/pricing</loc>`)
  expect(xml).toContain(`<loc>${origin}/waitlist</loc>`)
  expect(xml).toContain(`<loc>${origin}/changelog</loc>`)
  expect(xml).toContain(`<loc>${origin}/sponsor</loc>`)
  expect(xml).not.toContain('hreflang=')
})

test('sitemap includes single-locale docs paths without hreflang alternates', () => {
  const xml = buildSitemap(origin, ['/docs', '/docs/install'])
  // exact <url> block match — alternates would sit between </loc> and </url>
  expect(xml).toContain(`<url><loc>${origin}/docs</loc></url>`)
  expect(xml).toContain(`<url><loc>${origin}/docs/install</loc></url>`)
  // no zh-prefixed docs URL, and no alternate hreflang for docs
  expect(xml).not.toContain(`${origin}/zh/docs`)
})

test('localeHead: 中文 canonical + og', () => {
  const head = localeHead({ origin, locale: 'zh', path: '/pricing', title: 'T', description: 'D' })
  expect(head.links.find((l) => l.rel === 'canonical')?.href).toBe(`${origin}/pricing`)
  expect(head.links.some((l) => l.rel === 'alternate')).toBe(false)
  expect(head.meta.some((m) => m.title === 'T')).toBe(true)
  expect(head.meta.some((m) => m.property === 'og:url' && m.content === `${origin}/pricing`)).toBe(true)
})
