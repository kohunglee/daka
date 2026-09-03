import { useEffect, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  getSiteSettingsForAdminFn,
  setSiteCustomFooterHtmlForAdminFn,
  setSiteCustomHeadHtmlForAdminFn,
  setSiteTestSettingForAdminFn,
} from '@/features/settings/site-settings.admin.actions'

/** 666 管理中心中的全站 JSON 配置测试面板。 */
export function SiteSettingsPanel({ modeEnabled, modeReady }: { modeEnabled: boolean; modeReady: boolean }) {
  const [testEnabled, setTestEnabled] = useState(true)
  const [customFooterHtml, setCustomFooterHtml] = useState('')
  const [customHeadHtml, setCustomHeadHtml] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  /** 仅当 666 模式开启后读取全站配置，避免把管理数据暴露到普通界面。 */
  useEffect(() => {
    if (!modeReady || !modeEnabled) return
    void loadSettings()
  }, [modeEnabled, modeReady])

  /** 刷新当前全站测试开关状态。 */
  async function loadSettings() {
    setLoading(true)
    setMessage(null)
    try {
      const settings = await getSiteSettingsForAdminFn()
      setTestEnabled(settings.testEnabled)
      setCustomFooterHtml(settings.customFooterHtml)
      setCustomHeadHtml(settings.customHeadHtml)
    } catch {
      setMessage('全站配置读取失败，管理员会话可能已经失效。')
    } finally {
      setLoading(false)
    }
  }

  /** 保存站长可信的 Footer HTML；服务端会再次验证隐藏管理员会话。 */
  async function saveCustomFooterHtml() {
    setSaving(true)
    setMessage(null)
    try {
      const settings = await setSiteCustomFooterHtmlForAdminFn({ data: { html: customFooterHtml } })
      setCustomFooterHtml(settings.customFooterHtml)
      setMessage(settings.customFooterHtml ? '自定义 Footer HTML 已保存，将在全站页足后生效。' : '自定义 Footer HTML 已清空。')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Footer HTML 保存失败，请检查管理员会话后重试。')
    } finally {
      setSaving(false)
    }
  }

  /** 保存站长可信的 Head HTML；服务端会再次验证隐藏管理员会话。 */
  async function saveCustomHeadHtml() {
    setSaving(true)
    setMessage(null)
    try {
      const settings = await setSiteCustomHeadHtmlForAdminFn({ data: { html: customHeadHtml } })
      setCustomHeadHtml(settings.customHeadHtml)
      setMessage(settings.customHeadHtml ? '自定义 Head HTML 已保存，将在全站 head 中生效。' : '自定义 Head HTML 已清空。')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Head HTML 保存失败，请检查管理员会话后重试。')
    } finally {
      setSaving(false)
    }
  }

  /** 保存测试开关；服务端会再次校验隐藏管理员会话。 */
  async function toggleTestSetting(enabled: boolean) {
    setSaving(true)
    setMessage(null)
    try {
      const settings = await setSiteTestSettingForAdminFn({ data: { enabled } })
      setTestEnabled(settings.testEnabled)
      setMessage(settings.testEnabled ? '全站测试设置已开启。' : '全站测试设置已关闭。')
    } catch {
      setMessage('全站配置保存失败，请检查管理员会话后重试。')
    } finally {
      setSaving(false)
    }
  }

  if (!modeReady || !modeEnabled) {
    return (
      <Card className="max-w-2xl p-6">
        <p className="m-0 font-semibold">全站配置受 666 模式保护</p>
        <p className="mb-0 mt-2 text-sm leading-6 text-fg-2">请先在左下角开启 666 模式，才会读取或编辑全站 JSON 配置。</p>
      </Card>
    )
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <span className="rounded-lg bg-destructive/10 p-2 text-destructive"><SlidersHorizontal size={22} /></span>
        <div>
          <h1 className="m-0 text-2xl font-semibold">全站设置</h1>
          <p className="mb-0 mt-1 text-sm text-fg-2">数据保存在 site_settings 的单行 JSON 配置中，仅供 666 管理中心编辑。</p>
        </div>
      </div>

      <Card className="grid gap-5 p-5 sm:p-6">
        <div>
          <h2 className="m-0 text-base font-semibold">全站测试设置</h2>
          <p className="mb-0 mt-1 text-sm leading-6 text-fg-2">对应 JSON：<code>{'{"version":1,"testEnabled":true}'}</code>。用于验证全站配置的读写链路。</p>
        </div>
        {loading ? (
          <p className="m-0 text-sm text-fg-3">正在读取设置……</p>
        ) : (
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-border p-4 text-sm">
            <span>
              <span className="block font-semibold">开启全站测试开关</span>
              <span className="mt-1 block text-fg-2">当前状态：{testEnabled ? '已开启' : '已关闭'}</span>
            </span>
            <input
              type="checkbox"
              checked={testEnabled}
              disabled={saving}
              onChange={(event) => { void toggleTestSetting(event.target.checked) }}
              className="h-4 w-4 accent-primary"
            />
          </label>
        )}
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={() => void loadSettings()} disabled={loading || saving}>重新读取</Button>
        </div>
        {message && <p className="m-0 text-sm text-fg-2" role="status">{message}</p>}
      </Card>

      <Card className="mt-5 grid gap-4 p-5 sm:p-6">
        <div>
          <h2 className="m-0 text-base font-semibold">自定义 Footer HTML</h2>
          <p className="mb-0 mt-1 text-sm leading-6 text-fg-2">会追加到每个页面页足的末尾。支持 HTML、内联脚本与外部脚本，适合统计代码、客服组件等；只粘贴陛下完全信任的代码。</p>
        </div>
        <Textarea
          value={customFooterHtml}
          onChange={(event) => setCustomFooterHtml(event.target.value)}
          placeholder={'例如：<script src="https://example.com/analytics.js" defer></script>'}
          rows={10}
          maxLength={50_000}
          disabled={loading || saving}
          spellCheck={false}
          className="font-mono text-xs leading-5"
          aria-label="自定义 Footer HTML"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-fg-3">{customFooterHtml.length.toLocaleString()} / 50,000</span>
          <Button type="button" onClick={() => void saveCustomFooterHtml()} disabled={loading || saving}>保存 Footer HTML</Button>
        </div>
      </Card>

      <Card className="mt-5 grid gap-4 p-5 sm:p-6">
        <div>
          <h2 className="m-0 text-base font-semibold">自定义 Head HTML</h2>
          <p className="mb-0 mt-1 text-sm leading-6 text-fg-2">会追加到每个页面 head 的末尾。支持 meta、link、style、内联脚本与外部脚本；只粘贴陛下完全信任的代码。</p>
        </div>
        <Textarea
          value={customHeadHtml}
          onChange={(event) => setCustomHeadHtml(event.target.value)}
          placeholder={'例如：<meta name="google-site-verification" content="……" />'}
          rows={10}
          maxLength={50_000}
          disabled={loading || saving}
          spellCheck={false}
          className="font-mono text-xs leading-5"
          aria-label="自定义 Head HTML"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-fg-3">{customHeadHtml.length.toLocaleString()} / 50,000</span>
          <Button type="button" onClick={() => void saveCustomHeadHtml()} disabled={loading || saving}>保存 Head HTML</Button>
        </div>
      </Card>
    </div>
  )
}
