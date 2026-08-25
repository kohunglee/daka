import { test, expect } from 'vitest'
import { translate, negotiateLocale, activeLocales, defaultLocale, stripDefaultLocalePrefix } from '@/features/i18n/locale'
import { zh } from '@/features/i18n/dictionaries/zh'

test('stripDefaultLocalePrefix：去掉历史语言前缀且保留 query 和 hash', () => {
  expect(stripDefaultLocalePrefix('/en/pricing?ref=x')).toBe('/pricing?ref=x')
  expect(stripDefaultLocalePrefix('/en/sponsor?status=success&session_id=cs_1')).toBe('/sponsor?status=success&session_id=cs_1')
  expect(stripDefaultLocalePrefix('/en/docs#setup')).toBe('/docs#setup')
  expect(stripDefaultLocalePrefix('/en')).toBe('/')
  expect(stripDefaultLocalePrefix('/en?a=1')).toBe('/?a=1')
  expect(stripDefaultLocalePrefix('/en/')).toBe('/')
  expect(stripDefaultLocalePrefix('/zh/pricing?ref=x')).toBe('/pricing?ref=x')
})

test('translate 解析嵌套 key', () => {
  expect(translate(zh, 'home.title')).toBe('在边缘部署你的 SaaS')
})
test('translate 插值 {name}', () => {
  expect(translate(zh, 'home.greeting', { name: '小王' })).toBe('你好，小王！')
})
test('translate 缺失 key 回退为 key 本身', () => {
  expect(translate(zh, 'home.nope')).toBe('home.nope')
})
test('negotiateLocale：中文模式忽略历史语言偏好', () => {
  expect(negotiateLocale('zh', 'en-US,en')).toBe('zh')
  expect(negotiateLocale('en', 'en-US,en')).toBe('zh')
})
test('negotiateLocale：都不匹配回退默认', () => {
  expect(negotiateLocale('fr', 'fr-FR')).toBe(defaultLocale)
  expect(activeLocales).toContain(defaultLocale)
})
