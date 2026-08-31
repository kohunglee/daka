import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Copy, Search, UserRound, X } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { fmtDate } from '@/lib/format-date'
import { listAdminUsersForHiddenFn, type AdminUserPage } from '@/features/admin-clear/admin-clear.actions'
import type { AdminUserRow } from '@/features/admin/getAdminUsers'

/** 从用户昵称或邮箱生成简短头像文字，避免没有头像时出现空白。 */
function userInitials(name: string, email: string): string {
  const source = (name || email).trim()
  return source.slice(0, 2).toUpperCase()
}

/** 统一展示用户角色，避免数据库里的空值直接出现在管理界面。 */
function userRole(row: AdminUserRow): string {
  return row.role === 'admin' ? '管理员' : row.role ?? '普通用户'
}

/**
 * 注册用户管理面板。
 *
 * 第一版聚焦“找得到、看得懂”：支持邮箱/昵称/用户 ID 搜索、50 条分页和
 * 基础详情查看。封禁、删除等高风险操作暂不放进隐藏后台，避免误操作。
 */
export function AdminUsersPanel() {
  const [queryInput, setQueryInput] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [pageData, setPageData] = useState<AdminUserPage>({ rows: [], page: 0, pageSize: 50, total: 0, totalPages: 1 })
  const [selected, setSelected] = useState<AdminUserRow | null>(null)
  const [loading, setLoading] = useState(true)

  /** 读取当前搜索条件和页码的用户列表。 */
  const loadUsers = useCallback(async (page: number, q: string) => {
    setLoading(true)
    try {
      setPageData(await listAdminUsersForHiddenFn({ data: { page, q } }))
    } catch {
      toast.error('用户列表读取失败，请刷新页面重试。')
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
                <TableHead>状态</TableHead>
                <TableHead className="hidden md:table-cell">套餐</TableHead>
                <TableHead className="hidden md:table-cell">注册时间</TableHead>
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
                  <TableCell>{row.banned ? <Badge variant="warn" dot>已封禁</Badge> : <Badge variant="ok" dot>正常</Badge>}</TableCell>
                  <TableCell className="hidden md:table-cell">{row.plan === 'pro' ? <Badge variant="pro">Pro</Badge> : <span className="text-fg-3">{row.plan ? '免费版' : '—'}</span>}</TableCell>
                  <TableCell className="hidden text-fg-3 md:table-cell">{fmtDate(row.createdAt)}</TableCell>
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
              <p className="mb-0 mt-1 text-sm text-fg-2">当前版本只读查看，不执行封禁或删除。</p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(null)}><X size={15} />关闭</Button>
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
            <div><dt className="text-xs text-fg-3">账号状态</dt><dd className="m-0 mt-1">{selected.banned ? '已封禁' : '正常'}</dd></div>
            <div><dt className="text-xs text-fg-3">邮箱验证</dt><dd className="m-0 mt-1">{selected.emailVerified ? '已验证' : '未验证'}</dd></div>
            <div><dt className="text-xs text-fg-3">注册时间</dt><dd className="m-0 mt-1">{fmtDate(selected.createdAt)}</dd></div>
            <div><dt className="text-xs text-fg-3">最后更新</dt><dd className="m-0 mt-1">{fmtDate(selected.updatedAt)}</dd></div>
            <div><dt className="text-xs text-fg-3">套餐</dt><dd className="m-0 mt-1">{selected.plan === 'pro' ? 'Pro' : selected.plan ? '免费版' : '—'}</dd></div>
            <div><dt className="text-xs text-fg-3">Stripe 客户号</dt><dd className="m-0 mt-1 break-all font-mono text-xs">{selected.customerId ?? '—'}</dd></div>
          </dl>
        </Card>
      )}
    </>
  )
}
