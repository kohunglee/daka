import { defaultLocale, localizePath, type Locale } from '@/features/i18n/locale'

const PUBLIC_PATHS = ['/', '/pricing', '/changelog', '/sponsor', '/waitlist'] as const

// Open Graph 要求 language_TERRITORY 形态（en_US），裸语言码会被严格解析器忽略。
const OG_LOCALE: Record<Locale, string> = { en: 'en_US', zh: 'zh_CN' }

export function buildRobots(origin: string): string {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /*/app',
    'Disallow: /app',
    'Disallow: /*/admin',
    'Disallow: /admin',
    'Disallow: /api',
    `Sitemap: ${origin}/sitemap.xml`,
    // LLM-friendly docs (no standard robots directive — comment for discovery).
    `# llms.txt: ${origin}/llms.txt`,
    `# llms-full.txt: ${origin}/llms-full.txt`,
    '',
  ].join('\n')
}

/** 中文单语言模式：每个公开页面只保留一个规范 URL，不输出 hreflang 替代页。 */
export function buildSitemap(origin: string, singleLocalePaths: string[] = []): string {
  const publicPages = PUBLIC_PATHS.map(
    (p) => `<url><loc>${origin}${localizePath(defaultLocale, p)}</loc></url>`,
  )
  const single = singleLocalePaths.map((p) => `<url><loc>${origin}${p}</loc></url>`)
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...publicPages, ...single].join('')}</urlset>`
}

export interface HeadLink {
  rel: string
  href: string
  hrefLang?: string  // React/HTML camelCase prop name (renders to the `hreflang` attribute)
}

export interface HeadMeta {
  title?: string
  name?: string
  property?: string
  content?: string
}

export function localeHead(input: {
  origin: string
  locale: Locale
  path: string
  title: string
  description: string
}): { meta: HeadMeta[]; links: HeadLink[] } {
  const { origin, path, title, description } = input
  const canonical = `${origin}${localizePath(defaultLocale, path)}`
  const links: HeadLink[] = [{ rel: 'canonical', href: canonical }]
  const meta: HeadMeta[] = [
    { title },
    { name: 'description', content: description },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: canonical },
    { property: 'og:locale', content: OG_LOCALE[defaultLocale] },
    { property: 'og:image', content: `${origin}/logo512.png` },
    { name: 'twitter:card', content: 'summary_large_image' },
  ]
  return { meta, links }
}
