import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Copy, KeyRound, Search, Trash2, UserRound, X } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { fmtDate } from '@/lib/format-date'
import { deleteAdminUserForHiddenFn, listAdminUsersForHiddenFn, resetUserPasswordForHiddenFn, type AdminUserPage } from '@/features/admin-clear/admin-clear.actions'
import type { AdminUserRow } from '@/features/admin/getAdminUsers'

/** 从用户昵称或邮箱生成简短头像文字，避免没有头像时出现空白。 */
function userInitials(name: string, email: string): string {
  const source = (name || email).trim()
  return source.slice(0, 2).toUpperCase()
}

/** 渲染用户的登录来源渠道徽章（Google / GitHub / 邮箱密码）。 */
function renderProviderBadges(providers?: string[]) {
  if (!providers || providers.length === 0) {
    return <span className="text-xs text-fg-3">—</span>
  }
  return (
    <div className="flex flex-wrap gap-1">
      {providers.map((p) => {
        const label = p === 'google' ? 'Google' : p === 'github' ? 'GitHub' : p === 'credential' ? '邮箱密码' : p
        return (
          <Badge key={p} variant="outline" className="text-[11px] font-normal">
            {label}
          </Badge>
        )
      })}
    </div>
  )
}

/** 统一展示用户角色，避免数据库里的空值直接出现在管理界面。 */
function userRole(row: AdminUserRow): string {
  return row.role === 'admin' ? '管理员' : row.role ?? '普通用户'
}

/**
 * 注册用户管理面板。
 *
 * 支持邮箱/昵称/用户 ID 搜索、50 条分页、基础详情查看和带密码复核的用户删除。
 */
export function AdminUsersPanel() {
  const [queryInput, setQueryInput] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [pageData, setPageData] = useState<AdminUserPage>({ rows: [], page: 0, pageSize: 50, total: 0, totalPages: 1 })
  const [selected, setSelected] = useState<AdminUserRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<AdminUserRow | null>(null)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [resetTarget, setResetTarget] = useState<AdminUserRow | null>(null)
  const [resetNewPassword, setResetNewPassword] = useState('')
  const [resetConfirmPassword, setResetConfirmPassword] = useState('')
  const [resetAdminPassword, setResetAdminPassword] = useState('')
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetBusy, setResetBusy] = useState(false)

  /** 读取当前搜索条件和页码的用户列表。 */
  const loadUsers = useCallback(async (page: number, q: string): Promise<AdminUserPage | null> => {
    setLoading(true)
    try {
      const result = await listAdminUsersForHiddenFn({ data: { page, q } })
      setPageData(result)
      return result
    } catch {
      toast.error('用户列表读取失败，请刷新页面重试。')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadUsers(page, query)
  }, [loadUsers, page, query])

  /** 提交搜索并回到第一页。 */
  function submitSearch() {
    const nextQuery = queryInput.trim()
    setQuery(nextQuery)
    setPage(0)
  }

  /** 复制用户 ID，方便继续到其他管理工具定位同一个用户。 */
  function copyUserId(id: string) {
    void navigator.clipboard.writeText(id).then(() => toast.success('用户 ID 已复制')).catch(() => toast.error('复制失败，请手动选择。'))
  }

  /** 打开删除确认框；每次打开都会清空密码，确保每次删除都必须重新输入。 */
  function openDeleteDialog(row: AdminUserRow) {
    setDeleteTarget(row)
    setDeletePassword('')
    setDeleteError(null)
  }

  /** 关闭删除确认框，并丢弃本次输入的管理员密码。 */
  function closeDeleteDialog() {
    if (deleteBusy) return
    setDeleteTarget(null)
    setDeletePassword('')
    setDeleteError(null)
  }

  /** 向服务端提交用户删除；密码在服务端重新核对，前端状态不具备授权能力。 */
  async function handleDeleteUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!deleteTarget) return

    setDeleteBusy(true)
    setDeleteError(null)
    try {
      const result = await deleteAdminUserForHiddenFn({
        data: { userId: deleteTarget.id, password: deletePassword, confirmed: true },
      })
      if (result.status === 'invalid_password') {
        setDeleteError('管理员密码错误，请重新输入。')
        return
      }
      if (result.status === 'not_found') {
        setDeleteError('该用户已经不存在，列表可能已经更新。')
        return
      }

      const deletedName = deleteTarget.name || deleteTarget.email
      setSelected((current) => (current?.id === deleteTarget.id ? null : current))
      setDeleteTarget(null)
      setDeletePassword('')
      toast.success(`已删除用户 ${deletedName}，同时清理 ${result.deletedCheckins} 条打卡记录。`)
      const refreshed = await loadUsers(page, query)
      if (refreshed && refreshed.rows.length === 0 && page > 0) setPage(page - 1)
    } catch {
      setDeleteError('删除失败，请检查网络或管理员会话后重试。')
    } finally {
      setDeleteBusy(false)
    }
  }

  /** 打开重置密码框；每次打开都清空输入，确保新密码和管理员密码都必须重新填写。 */
  function openResetDialog(row: AdminUserRow) {
    setResetTarget(row)
    setResetNewPassword('')
    setResetConfirmPassword('')
    setResetAdminPassword('')
    setResetError(null)
  }

  /** 关闭重置密码框，并丢弃本次输入的所有密码字段。 */
  function closeResetDialog() {
    if (resetBusy) return
    setResetTarget(null)
    setResetNewPassword('')
    setResetConfirmPassword('')
    setResetAdminPassword('')
    setResetError(null)
  }

  /** 向服务端提交密码重置；管理员密码在服务端重新核对，前端状态不具备授权能力。 */
  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!resetTarget) return

    if (resetNewPassword !== resetConfirmPassword) {
      setResetError('两次输入的新密码不一致，请重新填写。')
      return
    }

    setResetBusy(true)
    setResetError(null)
    try {
      const result = await resetUserPasswordForHiddenFn({
        data: { userId: resetTarget.id, password: resetAdminPassword, newPassword: resetNewPassword },
      })
      if (result.status === 'invalid_password') {
        setResetError('管理员密码错误，请重新输入。')
        return
      }
      if (result.status === 'not_found') {
        setResetError('该用户已经不存在，列表可能已经更新。')
        return
      }

      toast.success(`已重置用户 ${resetTarget.name || resetTarget.email} 的登录密码。`)
      closeResetDialog()
    } catch {
      setResetError('重置失败，请检查网络或管理员会话后重试。')
    } finally {
      setResetBusy(false)
    }
  }

  /** 切换分页，同时关闭已经不属于当前列表的详情卡片。 */
  function goToPage(nextPage: number) {
    setSelected(null)
    setPage(nextPage)
  }

  const currentPage = page + 1

  return (
    <>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="m-0 text-2xl font-semibold">注册用户管理</h1>
          <p className="mb-0 mt-1 text-sm text-fg-2">查看已经注册的账号、注册时间、状态和套餐信息。</p>
        </div>
        <UserRound className="mt-1 shrink-0 text-primary" size={24} />
      </div>

      <Card className="mb-5 p-5 sm:p-6">
        <div className="flex max-w-2xl gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-3" size={17} />
            <Input
              className="pl-10 pr-9"
              value={queryInput}
              onChange={(event) => setQueryInput(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); submitSearch() } }}
              placeholder="搜索用户 ID、邮箱或昵称"
              aria-label="搜索用户 ID、邮箱或昵称"
            />
            {queryInput && (
              <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-fg-3 hover:text-foreground" onClick={() => setQueryInput('')} aria-label="清空搜索">
                <X size={15} />
              </button>
            )}
          </div>
          <Button type="button" onClick={submitSearch} disabled={loading}><Search size={16} />搜索</Button>
        </div>
        <p className="mb-0 mt-3 text-xs text-fg-3">共 {pageData.total} 个注册用户，每页 50 条。</p>
      </Card>

      <Card className={`overflow-hidden p-0 transition-opacity ${loading ? 'opacity-60' : ''}`}>
        {loading && pageData.rows.length === 0 ? (
          <p className="m-0 p-8 text-center text-sm text-fg-3">正在读取用户……</p>
        ) : pageData.rows.length === 0 ? (
          <p className="m-0 p-8 text-center text-sm text-fg-3">没有找到符合条件的注册用户。</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead>登录渠道</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="hidden md:table-cell">套餐</TableHead>
                <TableHead className="hidden md:table-cell">注册时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  tabIndex={0}
                  onClick={() => setSelected(row)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setSelected(row)
                    }
                  }}
                >
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar>
                        <AvatarImage src={row.image ?? undefined} alt="" />
                        <AvatarFallback>{userInitials(row.name, row.email)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <span className="block truncate font-semibold text-foreground">{row.name}</span>
                        <span className="block truncate font-mono text-xs text-fg-3">{row.id}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><span className="font-mono text-xs text-fg-3">{row.email}</span></TableCell>
                  <TableCell>{renderProviderBadges(row.providers)}</TableCell>
                  <TableCell>{row.banned ? <Badge variant="warn" dot>已封禁</Badge> : <Badge variant="ok" dot>正常</Badge>}</TableCell>
                  <TableCell className="hidden md:table-cell">{row.plan === 'pro' ? <Badge variant="pro">Pro</Badge> : <span className="text-fg-3">{row.plan ? '免费版' : '—'}</span>}</TableCell>
                  <TableCell className="hidden text-fg-3 md:table-cell">{fmtDate(row.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      disabled={deleteBusy}
                      onClick={(event) => {
                        event.stopPropagation()
                        openDeleteDialog(row)
                      }}
                    >
                      <Trash2 size={15} />删除
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
          <span className="text-xs text-fg-3">第 {currentPage} / {pageData.totalPages} 页</span>
          <div className="flex gap-1.5">
            <Button type="button" variant="outline" size="sm" disabled={loading || page === 0} onClick={() => goToPage(0)} aria-label="第一页"><ChevronsLeft size={15} /></Button>
            <Button type="button" variant="outline" size="sm" disabled={loading || page === 0} onClick={() => goToPage(page - 1)} aria-label="上一页"><ChevronLeft size={15} /></Button>
            <Button type="button" variant="outline" size="sm" disabled={loading || currentPage >= pageData.totalPages} onClick={() => goToPage(page + 1)} aria-label="下一页"><ChevronRight size={15} /></Button>
            <Button type="button" variant="outline" size="sm" disabled={loading || currentPage >= pageData.totalPages} onClick={() => goToPage(pageData.totalPages - 1)} aria-label="最后一页"><ChevronsRight size={15} /></Button>
          </div>
        </div>
      </Card>

      {selected && (
        <Card className="mt-5 p-5 sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="m-0 text-lg font-semibold">用户详情</h2>
              <p className="mb-0 mt-1 text-sm text-fg-2">详情只读；重置密码和删除操作都需重新输入管理员密码。</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => openResetDialog(selected)}><KeyRound size={15} />重置密码</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(null)}><X size={15} />关闭</Button>
            </div>
          </div>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-xs text-fg-3">昵称</dt><dd className="m-0 mt-1 font-semibold">{selected.name}</dd></div>
            <div><dt className="text-xs text-fg-3">邮箱</dt><dd className="m-0 mt-1 break-all font-mono text-xs">{selected.email}</dd></div>
            <div>
              <dt className="text-xs text-fg-3">用户 ID</dt>
              <dd className="m-0 mt-1 flex items-center gap-2 break-all font-mono text-xs">
                <span>{selected.id}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => copyUserId(selected.id)} aria-label="复制用户 ID"><Copy size={14} /></Button>
              </dd>
            </div>
            <div><dt className="text-xs text-fg-3">角色</dt><dd className="m-0 mt-1">{userRole(selected)}</dd></div>
            <div><dt className="text-xs text-fg-3">登录渠道 / 绑定方式</dt><dd className="m-0 mt-1">{renderProviderBadges(selected.providers)}</dd></div>
            <div><dt className="text-xs text-fg-3">账号状态</dt><dd className="m-0 mt-1">{selected.banned ? '已封禁' : '正常'}</dd></div>
            <div><dt className="text-xs text-fg-3">邮箱验证</dt><dd className="m-0 mt-1">{selected.emailVerified ? '已验证' : '未验证'}</dd></div>
            <div><dt className="text-xs text-fg-3">注册时间</dt><dd className="m-0 mt-1">{fmtDate(selected.createdAt)}</dd></div>
            <div><dt className="text-xs text-fg-3">最后更新</dt><dd className="m-0 mt-1">{fmtDate(selected.updatedAt)}</dd></div>
            <div><dt className="text-xs text-fg-3">套餐</dt><dd className="m-0 mt-1">{selected.plan === 'pro' ? 'Pro' : selected.plan ? '免费版' : '—'}</dd></div>
            <div><dt className="text-xs text-fg-3">Stripe 客户号</dt><dd className="m-0 mt-1 break-all font-mono text-xs">{selected.customerId ?? '—'}</dd></div>
          </dl>
        </Card>
      )}

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) closeDeleteDialog() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除注册用户</DialogTitle>
            <DialogDescription>
              将删除“{deleteTarget?.name || deleteTarget?.email || '该用户'}”及其账号关联数据、头像和全部打卡截图。此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDeleteUser} className="grid gap-4">
            <div className="grid gap-1.5">
              <label htmlFor="hidden-admin-delete-password" className="text-sm font-semibold">管理员密码</label>
              <Input
                id="hidden-admin-delete-password"
                type="password"
                value={deletePassword}
                onChange={(event) => setDeletePassword(event.target.value)}
                autoComplete="current-password"
                required
                autoFocus
              />
            </div>
            {deleteError && <p className="m-0 text-sm text-destructive" role="alert">{deleteError}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeDeleteDialog} disabled={deleteBusy}>取消</Button>
              <Button type="submit" disabled={deleteBusy} className="bg-destructive text-white hover:bg-destructive/90">
                <Trash2 size={15} />{deleteBusy ? '正在删除……' : '确认删除'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={resetTarget !== null} onOpenChange={(open) => { if (!open) closeResetDialog() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重置登录密码</DialogTitle>
            <DialogDescription>
              将“{resetTarget?.name || resetTarget?.email || '该用户'}”的登录密码改为下方填写的新密码；若该账号还没有邮箱密码登录方式，系统会自动补建。
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="grid gap-4">
            <div className="grid gap-1.5">
              <label htmlFor="hidden-admin-reset-new-password" className="text-sm font-semibold">新密码（6–128 位）</label>
              <Input
                id="hidden-admin-reset-new-password"
                type="password"
                value={resetNewPassword}
                onChange={(event) => setResetNewPassword(event.target.value)}
                autoComplete="new-password"
                required
                autoFocus
              />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="hidden-admin-reset-confirm-password" className="text-sm font-semibold">再次输入新密码</label>
              <Input
                id="hidden-admin-reset-confirm-password"
                type="password"
                value={resetConfirmPassword}
                onChange={(event) => setResetConfirmPassword(event.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="hidden-admin-reset-admin-password" className="text-sm font-semibold">管理员密码</label>
              <Input
                id="hidden-admin-reset-admin-password"
                type="password"
                value={resetAdminPassword}
                onChange={(event) => setResetAdminPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {resetError && <p className="m-0 text-sm text-destructive" role="alert">{resetError}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeResetDialog} disabled={resetBusy}>取消</Button>
              <Button type="submit" disabled={resetBusy}>
                <KeyRound size={15} />{resetBusy ? '正在重置……' : '确认重置'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
