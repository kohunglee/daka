import { createFileRoute, useRouter, Link } from '@tanstack/react-router'
import { useState, type ReactNode } from 'react'
import { requireUser } from '@/features/auth/middleware'
import { getEntitlement } from '@/features/billing/middleware'
import { signOut, changePassword, updateUser, deleteUser } from '@/features/auth/auth.client'
import { mapAuthError } from '@/features/auth/errors'
import { useTranslation } from '@/features/i18n/provider'
import { AppShell } from '@/components/app/app-shell'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { LogOut, Trash2 } from 'lucide-react'
import { ManageSubscription } from '@/features/billing/components/manage-subscription'
import { AvatarUploader } from '@/features/storage/components/avatar-uploader'
import { use666Mode } from '@/features/admin/mode-666'
import { getMyUserSettingsFn, setMyUserTestSettingFn } from '@/features/settings/user-settings.actions'

export const Route = createFileRoute('/{-$locale}/app/account')({
  head: () => ({ meta: [{ name: 'robots', content: 'noindex' }] }),
  loader: async ({ params }) => {
    const [user, ent, settings] = await Promise.all([
      requireUser({ data: { locale: (params as { locale?: string }).locale } }),
      getEntitlement(),
      getMyUserSettingsFn(),
    ])
    return { user, ent, settings }
  },
  component: AccountPage,
})

function Section({
  title,
  danger,
  children,
}: {
  title: string
  danger?: boolean
  children: ReactNode
}) {
  return (
    <Card
      className="mb-[18px] overflow-hidden p-0"
      style={danger ? { borderColor: 'color-mix(in srgb, var(--destructive) 45%, var(--border))' } : undefined}
    >
      <div className="border-b border-border px-[22px] py-[18px]">
        <h3 className="m-0 text-base font-semibold" style={{ color: danger ? 'var(--destructive)' : 'var(--foreground)' }}>
          {title}
        </h3>
      </div>
      <div className="p-[22px]">{children}</div>
    </Card>
  )
}

function AccountPage() {
  const { user, ent, settings } = Route.useLoaderData()
  const { t } = useTranslation()
  const router = useRouter()
  const { enabled: mode666 } = use666Mode()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState(false)
  const [pwBusy, setPwBusy] = useState(false)

  const [nickname, setNickname] = useState(user.name)
  const [nicknameError, setNicknameError] = useState<string | null>(null)
  const [nicknameSuccess, setNicknameSuccess] = useState(false)
  const [nicknameBusy, setNicknameBusy] = useState(false)

  const [testEnabled, setTestEnabled] = useState(settings.testEnabled)
  const [testSettingBusy, setTestSettingBusy] = useState(false)
  const [testSettingMessage, setTestSettingMessage] = useState<string | null>(null)

  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  /** 保存账号昵称；昵称沿用 Better Auth 的 name 字段，保存后刷新外壳中的用户信息。 */
  async function handleNickname(e: React.FormEvent) {
    e.preventDefault()
    const nextNickname = nickname.trim()
    if (!nextNickname) {
      setNicknameError('昵称不能为空。')
      return
    }

    setNicknameBusy(true)
    setNicknameError(null)
    setNicknameSuccess(false)
    const res = await updateUser({ name: nextNickname })
    setNicknameBusy(false)
    if (res.error) {
      setNicknameError(t(mapAuthError(res.error)))
      return
    }

    setNickname(nextNickname)
    setNicknameSuccess(true)
    await router.invalidate()
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwBusy(true)
    setPwError(null)
    setPwSuccess(false)
    const res = await changePassword({ currentPassword, newPassword, revokeOtherSessions: true })
    setPwBusy(false)
    if (res.error) {
      setPwError(t(mapAuthError(res.error)))
      return
    }
    setPwSuccess(true)
    setCurrentPassword('')
    setNewPassword('')
  }

  /** 保存当前用户自己的 JSON 测试设置，未来个人偏好继续沿用同一配置字段。 */
  async function handleUserTestSetting(enabled: boolean) {
    setTestSettingBusy(true)
    setTestSettingMessage(null)
    try {
      const nextSettings = await setMyUserTestSettingFn({ data: { enabled } })
      setTestEnabled(nextSettings.testEnabled)
      setTestSettingMessage(nextSettings.testEnabled ? '个人测试设置已开启。' : '个人测试设置已关闭。')
    } catch {
      setTestSettingMessage('个人测试设置保存失败，请稍后重试。')
    } finally {
      setTestSettingBusy(false)
    }
  }

  async function handleLogout() {
    await signOut()
    router.navigate({ to: '/{-$locale}/login' })
  }

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault()
    if (!confirm(t('auth.deleteConfirm'))) return
    setDeleteBusy(true)
    setDeleteError(null)
    const res = await deleteUser({ password: deletePassword })
    setDeleteBusy(false)
    if (res.error) {
      setDeleteError(t(mapAuthError(res.error)))
      return
    }
    router.navigate({ to: '/{-$locale}' })
  }

  return (
    <AppShell user={user} isPro={ent.plan === 'pro'} active="account" paymentFailed={ent.paymentFailed}>
      <div className="mb-6">
        <h1 className="page-h">{t('app.account')}</h1>
        <p className="mt-1.5 font-mono text-[13.5px] text-fg-3">{user.email}</p>
      </div>

      <div className="app-account-content w-full max-w-[980px]">
        {mode666 && (
          <Section title={t('storage.avatar')}>
            <AvatarUploader image={user.image} name={user.name} />
          </Section>
        )}

        <Section title="昵称">
          <form onSubmit={handleNickname} className="grid gap-4">
            <div className="field">
              <Label htmlFor="nickname">昵称</Label>
              <Input
                id="nickname"
                value={nickname}
                onChange={(e) => { setNickname(e.target.value); setNicknameSuccess(false) }}
                maxLength={50}
                required
                autoComplete="nickname"
              />
            </div>
            {nicknameError && <p className="text-sm text-destructive">{nicknameError}</p>}
            {nicknameSuccess && <p className="text-sm text-success">昵称已保存。</p>}
            <div>
              <Button type="submit" disabled={nicknameBusy}>{nicknameBusy ? '正在保存……' : '保存昵称'}</Button>
            </div>
          </form>
        </Section>

        {mode666 && (
          <Section title="个人设置demo">
            <div className="grid gap-4">
              <div>
                <p className="m-0 font-semibold">个人测试设置</p>
                <p className="mb-0 mt-1 text-sm leading-6 text-fg-2">对应 user.settings_json：<code>{'{"version":1,"testEnabled":true}'}</code>。用于验证个人配置的读写链路。</p>
              </div>
              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-border p-4 text-sm">
                <span>
                  <span className="block font-semibold">开启个人测试开关</span>
                  <span className="mt-1 block text-fg-2">当前状态：{testEnabled ? '已开启' : '已关闭'}</span>
                </span>
                <input
                  type="checkbox"
                  checked={testEnabled}
                  disabled={testSettingBusy}
                  onChange={(event) => { void handleUserTestSetting(event.target.checked) }}
                  className="h-4 w-4 accent-primary"
                />
              </label>
              {testSettingMessage && <p className="m-0 text-sm text-fg-2" role="status">{testSettingMessage}</p>}
            </div>
          </Section>
        )}

        <Section title={t('auth.changePassword')}>
          <form onSubmit={handleChangePassword} className="grid gap-4">
            <div className="field">
              <Label htmlFor="currentPassword">{t('auth.currentPassword')}</Label>
              <Input id="currentPassword" type="password" value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            <div className="field">
              <Label htmlFor="newPassword">{t('auth.newPassword')}</Label>
              <Input id="newPassword" type="password" value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
            </div>
            {pwError && <p className="text-sm text-destructive">{pwError}</p>}
            {pwSuccess && <p className="text-sm text-success">{t('app.passwordChanged')}</p>}
            <div>
              <Button type="submit" disabled={pwBusy}>{t('auth.changePassword')}</Button>
            </div>
          </form>
        </Section>

        {mode666 && (
          <Section title={t('billing.currentPlan')}>
            <ManageSubscription plan={ent.plan} status={ent.status} currentPeriodEnd={ent.currentPeriodEnd} lifetime={ent.lifetime} />
          </Section>
        )}

        {user.role === 'admin' && (
          <Section title={t('admin.title')}>
            <Link to="/{-$locale}/admin" className={buttonVariants({ variant: 'outline' })}>
              {t('admin.title')}
            </Link>
          </Section>
        )}

        <Section title={t('auth.logout')}>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut size={16} /> {t('auth.logout')}
          </Button>
        </Section>

        {mode666 && (
          <Section title={t('auth.deleteAccount')} danger>
            <form onSubmit={handleDelete} className="grid gap-4">
              <p className="m-0 text-[13.5px] text-fg-2">{t('auth.deleteConfirm')}</p>
              <div className="field">
                <Label htmlFor="deletePassword">{t('auth.password')}</Label>
                <Input id="deletePassword" type="password" value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)} required autoComplete="current-password" />
              </div>
              {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
              <div>
                <Button type="submit" disabled={deleteBusy} style={{ background: 'var(--destructive)', color: '#fff' }}>
                  <Trash2 size={16} /> {t('auth.deleteAccount')}
                </Button>
              </div>
            </form>
          </Section>
        )}
      </div>
    </AppShell>
  )
}
