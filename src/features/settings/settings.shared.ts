/**
 * 用户配置与全站配置共用的 JSON 约定。
 *
 * 这里仅处理已经定义的测试键，同时完整保留未来功能写入的未知键，避免新增一项
 * 配置时覆盖先前的配置内容。
 */
export const DEFAULT_SETTINGS_JSON = '{"version":1,"testEnabled":true,"customFooterHtml":""}'

/** 自定义页足 HTML 的上限：足够容纳常见统计脚本，又避免误粘贴整页内容。 */
export const MAX_CUSTOM_FOOTER_HTML_LENGTH = 50_000

/** 设置页当前可读的最小配置视图。 */
export interface TestSettingsView {
  testEnabled: boolean
}

/** 全站设置页需要读取的已定义配置；未知键仍原样保存在 JSON 中。 */
export interface SiteSettingsView extends TestSettingsView {
  customFooterHtml: string
}

/** 安全解析配置 JSON；异常、数组或空值都会回退到当前默认设置。 */
export function readTestSettings(settingsJson: string | null | undefined): TestSettingsView {
  const record = parseSettingsRecord(settingsJson)
  return { testEnabled: typeof record.testEnabled === 'boolean' ? record.testEnabled : true }
}

/** 读取全站设置的最小公开视图；页足 HTML 缺失或格式不正确时安全回退为空。 */
export function readSiteSettings(settingsJson: string | null | undefined): SiteSettingsView {
  const record = parseSettingsRecord(settingsJson)
  return {
    testEnabled: typeof record.testEnabled === 'boolean' ? record.testEnabled : true,
    customFooterHtml: typeof record.customFooterHtml === 'string' ? record.customFooterHtml : '',
  }
}

/** 只更新测试开关并保留未知键，为未来配置扩展提供向后兼容的合并写入方式。 */
export function updateTestSettingsJson(settingsJson: string | null | undefined, testEnabled: boolean): string {
  const record = parseSettingsRecord(settingsJson)
  const version = typeof record.version === 'number' && Number.isInteger(record.version) && record.version > 0 ? record.version : 1
  return JSON.stringify({ ...record, version, testEnabled })
}

/** 只更新全站 Footer HTML，并完整保留其他已知和未来的 JSON 键。 */
export function updateCustomFooterHtmlJson(settingsJson: string | null | undefined, customFooterHtml: string): string {
  const record = parseSettingsRecord(settingsJson)
  const version = typeof record.version === 'number' && Number.isInteger(record.version) && record.version > 0 ? record.version : 1
  return JSON.stringify({ ...record, version, customFooterHtml })
}

/** 将任意输入限制为普通对象，防止 JSON 数组或原始值进入配置根节点。 */
function parseSettingsRecord(settingsJson: string | null | undefined): Record<string, unknown> {
  if (!settingsJson) return {}
  try {
    const parsed: unknown = JSON.parse(settingsJson)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}
