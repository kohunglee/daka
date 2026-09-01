import { useEffect, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { getSiteSettingsForAdminFn, setSiteTestSettingForAdminFn } from '@/features/settings/site-settings.admin.actions'

/** 666 管理中心中的全站 JSON 配置测试面板。 */
export function SiteSettingsPanel({ modeEnabled, modeReady }: { modeEnabled: boolean; modeReady: boolean }) {
  const [testEnabled, setTestEnabled] = useState(true)
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
    } catch {
      setMessage('全站配置读取失败，管理员会话可能已经失效。')
    } finally {
      setLoading(false)
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
    </div>
  )
}
