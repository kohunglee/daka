import { en, type Dict } from './dictionaries/en'
import { zh } from './dictionaries/zh'

// 对外只开放中文；英文类型与字典保留，为将来恢复双语预留最小改动面。
export const locales = ['zh'] as const
export type Locale = 'en' | (typeof locales)[number]
// 当前产品面向中文用户：公开页面仅使用中文。英文字典先保留，未来可快速恢复双语。
export const activeLocales = locales
export const defaultLocale: Locale = 'zh'

export const dictionaries: Record<Locale, Dict> = { en, zh }

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (activeLocales as readonly string[]).includes(value)
}

type Params = Record<string, string | number>

/** 按点路径取文案；缺失回退 key；支持 {var} 插值。 */
export function translate(dict: Dict, key: string, params?: Params): string {
  const value = key.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in acc) return (acc as Record<string, unknown>)[part]
    return undefined
  }, dict)
  if (typeof value !== 'string') return key
  if (!params) return value
  return value.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in params ? String(params[name]) : `{${name}}`,
  )
}

/** 从完整 href 上剥掉历史语言前缀，保留 query 和 hash，统一为中文无前缀 URL。 */
export function stripDefaultLocalePrefix(href: string): string {
  const stripped = href.replace(/^\/(?:en|zh)(?=[/?#]|$)/, '')
  if (stripped === '') return '/'
  if (stripped.startsWith('?') || stripped.startsWith('#')) return `/${stripped}`
  return stripped
}

/** 中文为唯一公开语言，统一使用无前缀 URL。 */
export function localizePath(locale: Locale, path: string): string {
  const clean = path === '/' ? '' : path
  if (locale === defaultLocale) return clean || '/'
  return `/${locale}${clean}` || `/${locale}`
}

/** 中文单语言模式：忽略旧 cookie 与浏览器语言，始终返回中文。 */
export function negotiateLocale(
  _cookieLocale: string | undefined,
  _acceptLanguage: string | null,
): Locale {
  return defaultLocale
}
